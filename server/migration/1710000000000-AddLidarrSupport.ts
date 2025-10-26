import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLidarrSupport1710000000000 implements MigrationInterface {
  name = 'AddLidarrSupport1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "musicbrainzId" varchar`
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "musicbrainzReleaseGroupId" varchar`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_musicbrainzId" ON "media" ("musicbrainzId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_musicbrainzReleaseGroupId" ON "media" ("musicbrainzReleaseGroupId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_musicbrainzReleaseGroupId"`);
    await queryRunner.query(`DROP INDEX "IDX_musicbrainzId"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "musicbrainzReleaseGroupId"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "musicbrainzId"`);
  }
}
