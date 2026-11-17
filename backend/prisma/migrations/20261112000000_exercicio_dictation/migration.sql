-- Aditiva: novo tipo de exercício (ditado). Preserva exercícios, tentativas e progresso existentes.
ALTER TYPE "TipoExercicio" ADD VALUE IF NOT EXISTS 'dictation';
