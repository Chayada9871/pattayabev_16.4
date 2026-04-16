import { HomePage } from "@/components/site/home-page";
import { getArticles } from "@/lib/articles";
import { getServerSession } from "@/lib/auth";
import { getLatestProducts } from "@/lib/products";

export default async function Page() {
  const [latestProducts, articles, session] = await Promise.all([getLatestProducts(8), getArticles(), getServerSession()]);

  return (
    <HomePage
      latestProducts={latestProducts}
      latestArticles={articles.slice(0, 4)}
      showStaffTools={session?.user.role === "admin"}
    />
  );
}
