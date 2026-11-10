-- Aditiva: preserva exercícios, tentativas e progresso existentes.
ALTER TYPE "TipoExercicio" ADD VALUE IF NOT EXISTS 'sequence';
