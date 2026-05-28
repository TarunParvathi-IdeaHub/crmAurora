-- CreateTable
CREATE TABLE "degreeLevels" (
    "id" TEXT NOT NULL,
    "levelName" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,

    CONSTRAINT "degreeLevels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "degrees" (
    "id" TEXT NOT NULL,
    "degreeName" TEXT NOT NULL,
    "degreeShortName" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,

    CONSTRAINT "degrees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "programCode" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "programSname" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "degreeId" TEXT NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programs_institutionId_programCode_key" ON "programs"("institutionId", "programCode");

-- AddForeignKey
ALTER TABLE "degreeLevels" ADD CONSTRAINT "degreeLevels_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "degrees" ADD CONSTRAINT "degrees_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "degrees" ADD CONSTRAINT "degrees_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "degreeLevels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "degreeLevels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_degreeId_fkey" FOREIGN KEY ("degreeId") REFERENCES "degrees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
