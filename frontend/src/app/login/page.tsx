"use client";

import { useState } from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import { userPool } from "../../lib/cognito";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<CognitoUser | null>(null);
  const [message, setMessage] = useState("");

  const router = useRouter();

  const handleLogin = () => {
    const user = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (result: CognitoUserSession) => {
        setMessage("ログイン成功！");
        console.log("ID Token:", result.getIdToken().getJwtToken());
        localStorage.setItem("idToken", result.getIdToken().getJwtToken());
        router.push("/mypage"); // マイページへ遷移
      },
      onFailure: (err) => {
        console.error("ログイン失敗:", err);
        setMessage("ログイン失敗: " + err.message);
      },
      newPasswordRequired: () => {
        // 新しいパスワードフォーム表示
        setShowNewPasswordForm(true);
        setCognitoUser(user);
        setMessage("新しいパスワードが必要です");
      },
    });
  };

  const handleNewPasswordSubmit = () => {
    if (!cognitoUser) return;

    cognitoUser.completeNewPasswordChallenge(
      newPassword,
      {},
      {
        onSuccess: (result) => {
          setMessage("パスワード変更＆ログイン成功！");
          setShowNewPasswordForm(false);
          localStorage.setItem("idToken", result.getIdToken().getJwtToken());
          router.push("/mypage");
        },
        onFailure: (err) => {
          console.error("パスワード変更失敗:", err);
          setMessage("パスワード変更失敗: " + err.message);
        },
      }
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>ログイン</h1>
      {!showNewPasswordForm ? (
        <>
          <input
            placeholder="ユーザー名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>ログイン</button>
        </>
      ) : (
        <>
          <input
            type="password"
            placeholder="新しいパスワード"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button onClick={handleNewPasswordSubmit}>
            パスワード変更してログイン
          </button>
        </>
      )}
      <p>{message}</p>

      <style jsx>{`
        .container {
          max-width: 400px;
          margin: 80px auto;
          padding: 2rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
          text-align: center;
          font-family: sans-serif;
        }
        h1 {
          margin-bottom: 1.5rem;
        }
        input {
          display: block;
          width: 100%;
          padding: 0.8rem;
          margin: 0.5rem 0;
          font-size: 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        button {
          width: 100%;
          padding: 0.8rem;
          background-color: #0070f3;
          color: white;
          font-size: 1rem;
          border: none;
          border-radius: 4px;
          margin-top: 1rem;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        button:hover {
          background-color: #005ac1;
        }
        p {
          margin-top: 1rem;
          color: #e00;
        }
      `}</style>
    </div>
  );
}
