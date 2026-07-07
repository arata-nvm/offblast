# OffBlast

- [offblast-frontend](https://github.com/arata-nvm/offblast-frontend)
- [offblast-backend](https://github.com/arata-nvm/offblast-backend)

## 開発

```bash
npm install
npm run dev
npm test
```

## ビルド

```bash
# https://laws.e-gov.go.jp/bulkdownload/ から全法令XMLを展開し、
# そのディレクトリをBULK_DIRに指定
BULK_DIR=/path/to/xml npm run build:data
npm run build
```
