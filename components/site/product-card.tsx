import Image from "next/image";
import Link from "next/link";

import { ProductCardCartControl } from "@/components/cart/product-card-cart-control";
import { getServerSession } from "@/lib/auth";
import { estimateProductWeightKg } from "@/lib/checkout-config";
import { formatPrice } from "@/lib/currency";
import type { ProductCard as ProductCardData } from "@/lib/products";

type ProductCardProps = {
  product: ProductCardData;
  fallbackLabel?: string;
};

const loginToViewImageLabel = "เข้าสู่ระบบเพื่อดูรูปสินค้า";

export async function ProductCard({ product, fallbackLabel = "สินค้า" }: ProductCardProps) {
  const session = await getServerSession();
  const canViewProductImage = Boolean(session?.user);
  const sellingPrice = product.discountedPrice ?? product.price;
  const metaText =
    [product.bottleSizeMl ? `${product.bottleSizeMl} ml` : null, product.alcoholPercent ? `${product.alcoholPercent}%` : null]
      .filter(Boolean)
      .join(" • ") || "ดูรายละเอียดเพิ่มเติม";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#ece4d6] bg-white shadow-[0_10px_24px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(0,0,0,0.06)]">
      <Link href={`/products/${product.slug}`} className="group block flex-1">
        <div className="relative grid h-[240px] place-items-center bg-white">
          {canViewProductImage && product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-contain p-5" sizes="(max-width: 1280px) 50vw, 25vw" />
          ) : (
            <div className="grid h-[150px] w-[130px] place-items-center rounded-[28px] border-2 border-dashed border-[#d8cec0] bg-[#fbf8f2] px-4 text-center text-xs font-semibold leading-5 text-[#8f867b]">
              {loginToViewImageLabel}
            </div>
          )}
        </div>

        <div className="px-5 pt-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[#8b6a2b]">
            {product.brandName ?? product.categoryName ?? fallbackLabel}
          </p>
          <h3 className="mt-2 line-clamp-2 text-base font-extrabold text-[#171212] transition group-hover:text-[#2437e8]">
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-[#5f5852]">{metaText}</p>
        </div>
      </Link>

      <div className="px-5 pb-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`text-lg font-extrabold ${product.discountedPrice != null ? "text-[#d02022]" : "text-[#171212]"}`}>
              {formatPrice(sellingPrice, product.currency)}
            </p>
            {product.discountedPrice != null ? (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs font-semibold text-[#9b9187] line-through">
                  {formatPrice(product.price, product.currency)}
                </p>
                {product.activeDiscountPercent != null ? (
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#d02022]">
                    -{product.activeDiscountPercent}%
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
              product.inStock ? "bg-[#edf7ef] text-[#207443]" : "bg-[#fbe9e9] text-[#a61b1f]"
            }`}
          >
            {product.inStock ? "พร้อมส่ง" : "หมด"}
          </span>
        </div>

        <div className="mt-4">
          <ProductCardCartControl
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              imageUrl: canViewProductImage ? product.imageUrl : null,
              price: sellingPrice,
              currency: product.currency,
              originalPrice: product.discountedPrice != null ? product.price : null,
              estimatedWeightKg: estimateProductWeightKg(product.bottleSizeMl)
            }}
            disabled={!product.inStock}
          />
        </div>
      </div>
    </article>
  );
}
