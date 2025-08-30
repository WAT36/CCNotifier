import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("idToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      router.replace("/login"); // 未ログインならログインへリダイレクト
    }
    setChecking(false);
  }, []);

  if (checking) return <p>認証確認中...</p>;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
