/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // src/ 以下の *.test.ts ファイルを対象にする
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // ts-jest 用の最小設定（esModuleInterop は tsconfig.json から継承）
        esModuleInterop: true,
      },
    }],
  },
  // テスト実行から除外するパス
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/infra/', '/frontend/'],
};
