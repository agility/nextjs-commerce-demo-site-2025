import type { ContentItem, ImageField, LinkField } from "@agility/nextjs"
import type { IProduct } from "./IProduct"

export interface IFeaturedProducts {
  heading: string
  ctaText: string
  ctaLink: LinkField
  featuredProducts: ContentItem<IProduct>[] // Auto-populated by SDK for search list box
  productIDs: string
  productTitles: string
  backgroundImage?: ImageField
}
