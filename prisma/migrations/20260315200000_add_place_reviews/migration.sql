-- CreateTable
CREATE TABLE "PlaceReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "visited" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "placeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PlaceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaceReview_placeId_userId_key" ON "PlaceReview"("placeId", "userId");

-- AddForeignKey
ALTER TABLE "PlaceReview" ADD CONSTRAINT "PlaceReview_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceReview" ADD CONSTRAINT "PlaceReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
