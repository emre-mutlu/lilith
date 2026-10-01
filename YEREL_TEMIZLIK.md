# Yerel Temizlik — tek seferlik görev (2026-10-01)

> **Kime:** Emre'nin Mac'inde çalışan yerel Claude Code oturumuna.
> **Neden yerelde:** bulut oturumu bu bilgisayara erişemiyor ve `cline/f61e1`'i uzaktan silmeye
> yetkisi yoktu (403). Bağlam: `DEVIR_NOTU.md` → "10-01" bölümü ve `DOGRULAMA_2026-10-01.md`.
> **İş bitince bu dosya silinir** (adım 6).

## Kurallar

1. **Önce arşivle, sonra sil.** Arşiv adımlarından biri başarısız olursa hiçbir şeyi silme; Emre'ye sor.
2. **Koda dokunma.** Bu görev yalnız git artıklarını ve `DEVIR_NOTU.md`'yi ilgilendirir.
3. `git stash list`'te ajanla ilgisi olmayan (Emre'ye ait görünen) bir kayıt varsa onu **silme**, sor.
4. Bir öğe zaten yoksa (dal silinmiş, stash boş…) o adımı atla ve devam et.

Arşiv klasörü: `~/Documents/Claude/arsiv/lilith-eser/2026-10-01-temizlik/`

## Adımlar

### 1 · Durumu gör

```bash
git fetch origin --prune
git worktree list
git branch -a
git stash list
```

Emre'ye 2-3 satırda özetle: hangi worktree/dal/stash var.

### 2 · Arşivle

```bash
A="$HOME/Documents/Claude/arsiv/lilith-eser/2026-10-01-temizlik"
mkdir -p "$A"
```

- **Dış raporların orijinalleri** (`cline/f61e1`; yerelde yoksa `origin/cline/f61e1`):
  `git show <ref>:INCELEME_RAPORU.md > "$A/INCELEME_RAPORU.md"` · aynısı `PRUNE_RAPORU.md` için.
- **`cline/f61e1` worktree'sindeki commit'lenmemiş dosyalar** (ör. `OTURUM_RAPORU_2026-10-01.md`):
  worktree yolunu `git worktree list --porcelain`'den bul; `git -C <yol> ls-files --others --exclude-standard`
  listesindeki dosyaları `"$A/cline-untracked/"` altına göreli yollarıyla kopyala.
- **Ajanın 503 düzeltmesi:** `git format-patch main..ajan-503-fix-backup -o "$A/ajan-503-fix-backup"`
- **Stash'ler:** `git stash list > "$A/stash-list.txt"`; her biri için
  `git stash show -p --include-untracked "stash@{N}" > "$A/stash-N.patch"` (git ≥ 2.32).

Arşivdeki dosyaların boş olmadığını kontrol et (`ls -la "$A"` + patch'lerin satır sayısı).

### 3 · Karşılaştır (yalnız rapor, koda dokunma)

Ajanın 503 patch'i + stash'leri ile `main`'deki çözümü karşılaştır:
`server/dialogue.ts` → `retryKind`, `withRetry`, `withModelFallback`; `server/index.ts` → `/api/generate`.
`main`'de **olmayan** ve değerli görünen bir fikir varsa Emre'ye 2-3 cümleyle söyle. Yoksa "yeni bir şey yok" de.

### 4 · Sil

```bash
git worktree remove <cline-worktree-yolu>      # commit'lenmemiş dosya varsa: --force (2. adımda arşivlendi)
git branch -D cline/f61e1
git branch -D ajan-503-fix-backup
git stash clear                                # yalnız tüm kayıtlar ajana aitse; değilse tek tek drop
git push origin --delete cline/f61e1
git fetch --prune
```

### 5 · Güncelle

```bash
git switch main
git pull --ff-only
```

### 6 · Kapat

`DEVIR_NOTU.md` → 10-01 bölümündeki **"Bekleyen (yalnız yerel makinede)"** maddesini şununla değiştir:

> - **Yerel temizlik TAMAM (tarih):** `cline/f61e1` (yerel + uzak + worktree), `ajan-503-fix-backup`, stash'ler silindi; önce `~/Documents/Claude/arsiv/lilith-eser/2026-10-01-temizlik/`'e arşivlendi. 503 karşılaştırması: <3. adımın tek cümlelik sonucu>.

Sonra bu dosyayı sil ve tek commit'le `main`'e push et:

```bash
git rm YEREL_TEMIZLIK.md
git add DEVIR_NOTU.md
git commit -m "Yerel temizlik tamam: cline/f61e1 + ajan-503-fix-backup + stash'ler arşivlenip silindi"
git push origin main
```

### 7 · Raporla

Emre'ye kısaca yaz: ne arşivlendi (dosya listesi), ne silindi, 3. adımın sonucu.
