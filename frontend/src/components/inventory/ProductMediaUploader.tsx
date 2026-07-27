/**
 * Purpose: Main image / video upload + preview for a product Item.
 * Exports: ProductMediaUploader
 *
 * Last updated: 2026-07-26
 * Author: Pramniaga
 */
import { useRef, useState } from 'react'
import { ImagePlus, Video } from 'lucide-react'
import { API, useApiCall } from '@/lib/api'
import type { ProductMedia, ProductMediaUploadResult } from '@/lib/types'
import { Button, ErrorBanner } from '@/components/ui'
import { fileToBase64, productImageSrc } from '@/lib/utils'
import productsFallback from '@/assets/inventory/products.jpg'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const VIDEO_MAX_BYTES = 50 * 1024 * 1024

export interface ProductMediaUploaderProps {
	itemCode: string
	media: ProductMedia
	canEdit: boolean
	onMediaChange: (media: ProductMedia) => void
}

/**
 * ProductMediaUploader - Full-bleed image hero plus optional video upload for a product.
 *
 * @param props.itemCode - Item code to attach media to.
 * @param props.media - Current image / video URLs.
 * @param props.canEdit - Whether the user may upload.
 * @param props.onMediaChange - Callback when media URLs change after upload.
 * @returns Media upload section.
 */
export function ProductMediaUploader({ itemCode, media, canEdit, onMediaChange }: ProductMediaUploaderProps) {
	const imageInputRef = useRef<HTMLInputElement>(null)
	const videoInputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState<string | null>(null)
	const [uploadingKind, setUploadingKind] = useState<'image' | 'video' | null>(null)
	const { call: uploadMedia } = useApiCall<ProductMediaUploadResult>(API.inventory.itemsUploadMedia)

	const imageSrc = productImageSrc(media.image, productsFallback)
	const videoSrc = media.video_url
		? productImageSrc(media.video_url)
		: null

	async function handleUpload(kind: 'image' | 'video', file: File | undefined) {
		if (!file || !canEdit) return
		setError(null)

		const max = kind === 'image' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES
		if (file.size > max) {
			setError(kind === 'image' ? 'Image must be 5 MB or smaller.' : 'Video must be 50 MB or smaller.')
			return
		}

		setUploadingKind(kind)
		try {
			const filedata = await fileToBase64(file)
			const result = await uploadMedia({
				item_code: itemCode,
				media_kind: kind,
				filename: file.name,
				filedata,
			})
			onMediaChange({
				item_code: itemCode,
				image: result.image ?? media.image,
				video_url: result.video_url ?? (kind === 'video' ? result.file_url : media.video_url),
			})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to upload media')
		} finally {
			setUploadingKind(null)
		}
	}

	return (
		<section className="space-y-4">
			<div>
				<h2 className="font-display text-lg font-semibold text-ink">Main media</h2>
				<p className="mt-1 text-sm text-ink-muted">Add a catalog image and an optional product video.</p>
			</div>
			{error ? <ErrorBanner message={error} /> : null}

			<div className="overflow-hidden rounded-xl border border-line bg-surface-2">
				<div className="relative aspect-[16/9] w-full bg-ink/5">
					<img src={imageSrc} alt="" className="h-full w-full object-cover" />
					{canEdit ? (
						<div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-ink/50 to-transparent p-4">
							<input
								ref={imageInputRef}
								type="file"
								accept="image/jpeg,image/png,image/gif,image/webp"
								className="hidden"
								onChange={(e) => {
									void handleUpload('image', e.target.files?.[0])
									e.target.value = ''
								}}
							/>
							<Button
								type="button"
								variant="secondary"
								disabled={uploadingKind !== null}
								onClick={() => imageInputRef.current?.click()}
							>
								<ImagePlus className="h-4 w-4" />
								{uploadingKind === 'image' ? 'Uploading…' : 'Upload image'}
							</Button>
						</div>
					) : null}
				</div>
			</div>

			<div className="rounded-xl border border-line bg-white p-4">
				<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div>
						<p className="text-sm font-medium text-ink">Product video</p>
						<p className="text-xs text-ink-muted">Optional MP4 or WebM, up to 50 MB.</p>
					</div>
					{canEdit ? (
						<>
							<input
								ref={videoInputRef}
								type="file"
								accept="video/mp4,video/webm"
								className="hidden"
								onChange={(e) => {
									void handleUpload('video', e.target.files?.[0])
									e.target.value = ''
								}}
							/>
							<Button
								type="button"
								variant="secondary"
								disabled={uploadingKind !== null}
								onClick={() => videoInputRef.current?.click()}
							>
								<Video className="h-4 w-4" />
								{uploadingKind === 'video' ? 'Uploading…' : videoSrc ? 'Replace video' : 'Upload video'}
							</Button>
						</>
					) : null}
				</div>
				{videoSrc ? (
					<video key={videoSrc} controls className="max-h-72 w-full rounded-lg bg-ink/90" src={videoSrc}>
						Your browser does not support video playback.
					</video>
				) : (
					<p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
						No video yet.
					</p>
				)}
			</div>
		</section>
	)
}
