// lib/cognito.ts
import { CognitoUserPool } from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_USERPOOL_ID!, // あなたのUser Pool ID
  ClientId: process.env.NEXT_PUBLIC_APPCLIENT_ID!, // アプリクライアントID
};

export const userPool = new CognitoUserPool(poolData);
