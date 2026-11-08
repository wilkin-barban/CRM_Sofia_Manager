# Assets de documentação

## `social-preview-1280x640.png`

Imagem de social preview do repositório (Open Graph / GitHub social preview),
em 1280x640.

- **Origem:** derivada de `apps/web/public/banners/banner-og-dark-1200x630.png`
  (1200x630, banner verificado; sha256
  `73418c84e8a90788450a33acd5552c903239b43d0d707902ba245d71332baa9e`).
- **Transformação:** resize para 1280x672 com `flags=lanczos` (mesma proporção
  1200:630) e recorte de 16px no topo e 16px na base, resultando em 1280x640.
- **Tagline:** `ATENDIMENTO OMNICHANNEL · PEDIDOS · RAG` aplicada na faixa
  inferior, em `#93A4BC` sobre o fundo do banner, sem cobrir o logo nem o título.
- **sha256:** `b49dbeecc218dafc57f84faf5e8bdd74022e846323cc88a3715186a3f4382666`.
- O banner original **não** é modificado por este processo.

### Regeneração

Requisitos: `ffmpeg` com `drawtext` (libfreetype) e a fonte DejaVu Sans.

```bash
# a partir da raiz do repositório
mkdir -p docs/assets
printf 'A T E N D I M E N T O   O M N I C H A N N E L   ·   P E D I D O S   ·   R A G' > /tmp/tagline.txt

ffmpeg -y -hide_banner -loglevel error \
  -i apps/web/public/banners/banner-og-dark-1200x630.png \
  -vf "scale=1280:672:flags=lanczos,crop=1280:640:0:16,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile=/tmp/tagline.txt:fontcolor=0x93A4BC:fontsize=20:x=(w-text_w)/2:y=h-58" \
  -frames:v 1 docs/assets/social-preview-1280x640.png
```

Verificação:

```bash
file docs/assets/social-preview-1280x640.png   # PNG image data, 1280 x 640
sha256sum docs/assets/social-preview-1280x640.png
```

### Uso

- Referenciada como hero no início do `README.md`.
- A social preview do GitHub é configurada manualmente em **Settings → Social
  preview**; a API do GitHub não expõe esse upload.
