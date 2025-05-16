# Vercel Blob Storage Implementation

This project uses Vercel Blob Storage for file uploads, which is particularly important for Vercel deployments since the filesystem is read-only in production.

## Setup and Configuration

### 1. Dependencies

The project uses the `@vercel/blob` package to interact with Vercel Blob Storage:

```bash
npm install @vercel/blob
```

### 2. Environment Variables

To use Vercel Blob Storage, you need to set up the following environment variables:

- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob Storage read-write token

For local development:
1. Create a `.env.local` file if it doesn't exist
2. Add your Blob Storage token: `BLOB_READ_WRITE_TOKEN=your_token_here`

For Vercel deployment:
1. Go to your Vercel project settings
2. Navigate to the "Environment Variables" section
3. Add `BLOB_READ_WRITE_TOKEN` with your token value

### 3. Creating a Blob Store in Vercel

To get your Blob Storage token:

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Storage → Blob
3. Create a new Blob store
4. Copy the token provided

## Implementation Details

### API Route Implementation

The file upload is handled in the `src/app/api/submit-appointment/route.ts` file. Key features:

- Files are uploaded directly to Vercel Blob Storage from the server
- Each file gets a unique path based on timestamp and original filename
- Files are stored with public access for easy retrieval
- Full URLs are stored in the database for reference

```typescript
// Example implementation
import { put } from '@vercel/blob';

// Inside your API route handler:
const blobPathname = `appointments/${timestamp}-${i}-${sanitizedFileName}`;
const { url } = await put(blobPathname, blob, {
  access: 'public',
  contentType: file.type,
  addRandomSuffix: false,
  cacheControlMaxAge: 31536000, // Cache for 1 year
});

// Store the URL in your database
fileUrls.push(url);
```

### Frontend Implementation

The frontend component `FileUpload.tsx` handles:
- File selection and validation
- Preview generation for images
- Temporary client-side storage

No changes were needed on the frontend, as it simply passes the files to the API route.

## Usage in Templates

When displaying uploaded files:

```jsx
// Example of displaying an uploaded image
const fileUrls = JSON.parse(appointment.fileUrls || '[]');
fileUrls.map(url => (
  <img 
    key={url} 
    src={url} 
    alt="Uploaded file" 
  />
))
```

## Benefits of Vercel Blob Storage

1. **Scalability**: Files are stored in a CDN-backed, globally distributed storage system
2. **Performance**: Fast content delivery through edge caching
3. **Reliability**: High availability and redundancy
4. **Simplicity**: Simple API that works seamlessly with Next.js and Vercel deployments
5. **Security**: Access control through tokens and permission models

## Limitations and Considerations

1. **Storage Limits**: Be aware of the storage limits in your Vercel plan
2. **Cost**: Storage and bandwidth usage may incur additional costs
3. **Token Security**: Keep your `BLOB_READ_WRITE_TOKEN` secure and never expose it on the client side
4. **File Sizes**: Current implementation limits files to 5MB each

## Additional Resources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Blob API Reference](https://vercel.com/docs/storage/vercel-blob/client-api)