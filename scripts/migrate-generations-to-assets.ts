import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const generations = await prisma.generation.findMany({
    where: {
      status: 'COMPLETED',
      type: { in: ['image', 'video'] },
      result: { not: null },
    },
  });

  console.log(`Found ${generations.length} completed image/video generations`);

  let created = 0;
  let skipped = 0;

  for (const gen of generations) {
    const urls = gen.result!.split('\n').filter((u) => u.trim());

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (!url) continue;

      const exists = await prisma.asset.findFirst({ where: { url } });
      if (exists) {
        skipped++;
        continue;
      }

      const isVideo = gen.type === 'video';
      const ext = isVideo ? 'mp4' : 'png';
      const mimeType = isVideo ? 'video/mp4' : 'image/png';

      await prisma.asset.create({
        data: {
          brandId: gen.brandId,
          type: isVideo ? 'VIDEO' : 'IMAGE',
          source: 'AI_GENERATED',
          url,
          filename: `${gen.modelName}-${gen.id}-${i}.${ext}`,
          mimeType,
          sizeBytes: 0,
          tags: ['ai-generated', gen.type],
          createdById: gen.userId,
          createdAt: gen.createdAt,
        },
      });
      created++;
    }
  }

  console.log(`Done: ${created} assets created, ${skipped} duplicates skipped`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
