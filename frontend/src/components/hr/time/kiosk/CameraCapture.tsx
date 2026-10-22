'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { useHrT } from '../../../../lib/hr/i18n';
import { Button } from '../../ui';

/**
 * Front camera preview → one JPEG. `onCapture(null)` means the camera can't be used
 * (denied or missing); the caller decides whether that blocks the punch.
 */
export default function CameraCapture({ onCapture, onCancel }: { onCapture: (photo: Blob | null) => void; onCancel: () => void }) {
  const { t } = useHrT();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [failed, setFailed] = useState(false);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) { setFailed(true); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(tr => tr.stop()); return; }
        stream.current = s;
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach(tr => tr.stop());
    };
  }, []);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  function take() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror like the preview, square crop from the centre
    ctx.translate(480, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, 480, 480);
    canvas.toBlob(b => { if (b) setShot({ blob: b, url: URL.createObjectURL(b) }); }, 'image/jpeg', 0.8);
  }

  if (failed) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-base font-semibold text-ink-800">{t('ksk.camera.failed')}</p>
        <p className="text-sm text-ink-500">{t('ksk.camera.failedHint')}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button onClick={() => onCapture(null)}>{t('ksk.camera.continueWithout')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-ink-900">
        {shot
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={shot.url} alt="" className="h-full w-full object-cover" />
          : <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />}
      </div>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
        {shot
          ? <>
              <Button variant="outline" onClick={() => setShot(null)}><RotateCcw /> {t('ksk.camera.retake')}</Button>
              <Button onClick={() => onCapture(shot.blob)}>{t('ksk.camera.use')}</Button>
            </>
          : <Button onClick={take}><Camera /> {t('ksk.camera.take')}</Button>}
      </div>
    </div>
  );
}
