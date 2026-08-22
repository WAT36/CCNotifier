import { PrismaClient } from '@prisma/client';

// 各ファイルで個別にnew PrismaClient()すると、DBがPgBouncer(pooler)経由の場合に
// 接続プールを使い切ってしまい、後続のクエリが無応答のまま固まることがあるため、
// プロセス全体で1つのインスタンスを共有する
export const prisma: PrismaClient = new PrismaClient();
