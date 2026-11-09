#!/bin/sh
# Prepara uma VPS Ubuntu 24.04 nova para o Sweet Way English. Rode UMA vez, como root, logado com chave SSH:
#
#   scp deploy/preparar-vps.sh root@IP:/root/ && ssh root@IP sh /root/preparar-vps.sh
#
# O que faz: atualiza o sistema; instala Docker; cria o usuário `deploy` (grupo docker, mesma chave SSH do root);
# SSH só por chave e sem login de root; firewall (22, 80, 443); atualizações de segurança automáticas; fail2ban;
# swap de 2 GB se não houver; pasta /opt/sweetway. Pode rodar de novo sem estragar nada.
set -eu

USUARIO="${USUARIO:-deploy}"
PASTA="${PASTA:-/opt/sweetway}"

[ "$(id -u)" = 0 ] || { echo "Rode como root."; exit 1; }
[ -s /root/.ssh/authorized_keys ] || { echo "Entre com chave SSH antes: o script desliga o login por senha."; exit 1; }

export DEBIAN_FRONTEND=noninteractive
echo "== Sistema"
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl ufw fail2ban unattended-upgrades

echo "== Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
# Logs dos containers com rotação (o compose também limita, isto cobre o resto)
if [ ! -f /etc/docker/daemon.json ]; then
  printf '{\n  "log-driver": "json-file",\n  "log-opts": { "max-size": "10m", "max-file": "5" }\n}\n' > /etc/docker/daemon.json
  systemctl restart docker
fi

echo "== Usuário $USUARIO"
if ! id "$USUARIO" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$USUARIO"
fi
usermod -aG docker "$USUARIO"
install -d -m 700 -o "$USUARIO" -g "$USUARIO" "/home/$USUARIO/.ssh"
install -m 600 -o "$USUARIO" -g "$USUARIO" /root/.ssh/authorized_keys "/home/$USUARIO/.ssh/authorized_keys"
install -d -o "$USUARIO" -g "$USUARIO" "$PASTA" "$PASTA/deploy" "$PASTA/deploy/rclone"

echo "== SSH só por chave"
cat > /etc/ssh/sshd_config.d/99-sweetway.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
sshd -t
systemctl reload ssh

echo "== Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
# Atenção: portas publicadas pelo Docker passam por fora do ufw. O docker-compose.prod.yml só publica 80/443 (Caddy).

echo "== Atualizações de segurança automáticas"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo "== fail2ban (sshd)"
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "== Swap"
if [ "$(swapon --show | wc -l)" -eq 0 ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo
echo "Pronto. A partir de agora entre como: ssh $USUARIO@$(hostname -I | awk '{print $1}')"
echo "Próximo passo: docs/deploy.md, \"Primeira subida\"."
