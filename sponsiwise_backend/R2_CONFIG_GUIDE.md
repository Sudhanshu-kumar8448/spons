# Cloudflare R2 Configuration Guide

## Environment Variables to Update

Replace the following in your `.env` file:

```
# ========================
# CLOUDFLARE R2 CONFIGURATION
# ========================

# R2 Endpoint URL (S3 API Endpoint from Cloudflare Dashboard)
S3_ENDPOINT=https://1afa3dcdc2430ce5544c9e49d56dfaf9.r2.cloudflarestorage.com

# R2 Access Key ID
S3_ACCESS_KEY=109fb90da143773df9097ce79b152471

# R2 Secret Access Key
S3_SECRET_KEY=44bb1b1174a78118da5cd9f84a9ca58470ec0acdb361cce6948beddb453a85ca

# R2 Bucket Name
S3_BUCKET=sponsiwise

# R2 Region (always 'auto' for Cloudflare R2)
S3_REGION=auto
```

## Important Notes

1. **No code changes needed** - Your `s3.service.ts` is already S3-compatible and works with Cloudflare R2

2. **Public URLs** - Since you don't have a custom domain bound to R2, public URLs will look like:
   ```
   https://1afa3dcdc2430ce5544c9e49d56dfaf9.r2.cloudflarestorage.com/sponsiwise/your-file-key
   ```

3. **After updating .env**, restart your backend:
   ```bash
   cd sponsiwise_backend
   npm run start:dev
   ```

4. **Verify connection** - Check backend logs for:
   ```
   S3Service initializing...
     Bucket: sponsiwise
     Region: auto
     Endpoint: https://1afa3dcdc2430ce5544c9e49d56dfaf9.r2.cloudflarestorage.com
     IsLocal: false
   S3Service initialized successfully
