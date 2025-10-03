import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.REGION || "",
});

export interface CsvUploadResult {
  success: boolean;
  fileName: string;
  message: string;
}

/**
 * CSVファイルをS3バケットにアップロードする
 * @param fileBuffer - アップロードするファイルのバッファ
 * @param originalFileName - 元のファイル名
 * @param bucketName - S3バケット名
 * @returns アップロード結果
 */
export async function uploadCsvToS3(
  fileBuffer: Buffer,
  originalFileName: string,
  bucketName: string = process.env.CSV_UPLOAD_BUCKET_NAME || ""
): Promise<CsvUploadResult> {
  try {
    // S3にアップロード
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: originalFileName,
      Body: fileBuffer,
      ContentType: "text/csv",
    });

    await s3Client.send(command);

    return {
      success: true,
      fileName: originalFileName,
      message: `ファイルが正常にアップロードされました: ${originalFileName}`,
    };
  } catch (error) {
    console.error("CSVアップロードエラー:", error);
    return {
      success: false,
      fileName: originalFileName,
      message: `アップロードに失敗しました: ${
        error instanceof Error ? error.message : "不明なエラー"
      }`,
    };
  }
}
