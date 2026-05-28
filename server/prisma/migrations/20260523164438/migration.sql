-- AlterEnum (idempotent: value was already added in 20260523111801_application_status)
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'APPLICATION_FEE_PAID';
