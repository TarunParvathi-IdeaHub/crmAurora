-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "institutionCode" TEXT NOT NULL,
    "institutionArea" TEXT NOT NULL,
    "institutionCity" TEXT NOT NULL,
    "institutionState" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employeeRoles" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "staffType" TEXT NOT NULL,
    "rolePrefix" TEXT NOT NULL,
    "roleCount" INTEGER NOT NULL,
    "institutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employeeRoles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "empId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "alternateMobileNo" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "caste" TEXT NOT NULL,
    "sscMemo" TEXT,
    "intermediateMemo" TEXT,
    "ugMemo" TEXT,
    "pgMemo" TEXT,
    "phdMemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collegeAdmins" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "empId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "alternateMobileNo" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "caste" TEXT NOT NULL,
    "sscMemo" TEXT,
    "intermediateMemo" TEXT,
    "ugMemo" TEXT,
    "pgMemo" TEXT,
    "phdMemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collegeAdmins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_institutionCode_key" ON "institutions"("institutionCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_userId_key" ON "users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employeeRoles_roleId_key" ON "employeeRoles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "employeeRoles_rolePrefix_key" ON "employeeRoles"("rolePrefix");

-- CreateIndex
CREATE UNIQUE INDEX "admins_empId_key" ON "admins"("empId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_mobileNo_key" ON "admins"("mobileNo");

-- CreateIndex
CREATE UNIQUE INDEX "collegeAdmins_empId_key" ON "collegeAdmins"("empId");

-- CreateIndex
CREATE UNIQUE INDEX "collegeAdmins_userId_key" ON "collegeAdmins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "collegeAdmins_email_key" ON "collegeAdmins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "collegeAdmins_mobileNo_key" ON "collegeAdmins"("mobileNo");

-- AddForeignKey
ALTER TABLE "employeeRoles" ADD CONSTRAINT "employeeRoles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collegeAdmins" ADD CONSTRAINT "collegeAdmins_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
