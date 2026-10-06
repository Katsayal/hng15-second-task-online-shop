import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { prisma } from "@/lib/prisma";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-zinc-600 hover:text-zinc-950"
      >
        ← Back to products
      </Link>
      <ProductDetail
        product={{
          id: product.id,
          name: product.name,
          price: Number(product.price),
          imageUrl: product.imageUrl,
          stockQuantity: product.stockQuantity,
          description: product.description,
        }}
      />
    </main>
  );
}
