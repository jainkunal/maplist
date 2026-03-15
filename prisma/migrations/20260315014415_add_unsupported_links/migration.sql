-- CreateTable
CREATE TABLE "UnsupportedLink" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnsupportedLink_pkey" PRIMARY KEY ("id")
);
