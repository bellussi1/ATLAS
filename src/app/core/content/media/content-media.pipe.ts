import { inject, Pipe, type PipeTransform } from '@angular/core';
import { ContentRepository } from '@core/content/repositories/content-repository.service';

/**
 * Local licensed paths map to their public R2 address; the file itself never ships with the app.
 * Commons thumbnails (hybrid media) use the mirrored copy on the public bucket when the release
 * has one and otherwise keep the original absolute address.
 */
@Pipe({ name: 'contentMedia' })
export class ContentMediaPipe implements PipeTransform {
  private readonly repository = inject(ContentRepository);

  transform(assetPath: string | null | undefined): string | null {
    if (!assetPath) return null;
    return assetPath.startsWith('/')
      ? this.repository.mediaUrl(assetPath)
      : (this.repository.mirrorUrl(assetPath) ?? assetPath);
  }
}
