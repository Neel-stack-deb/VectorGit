# VectorGit - OpenRouter Configuration Guide

## 🔑 Setting Up OpenRouter API

VectorGit now uses **OpenRouter API** for embeddings. This gives you flexibility to use multiple LLM providers.

---

## Step 1: Get Your OpenRouter API Key

### Option A: Sign Up (New Account)
1. Go to: https://openrouter.ai
2. Click "Sign Up"
3. Create your account
4. Go to **API Keys** section
5. Click **Create New Key**
6. Copy your key (format: `sk-or-v1-...`)

### Option B: Existing Account
1. Go to: https://openrouter.ai/dashboard
2. Navigate to **API Keys**
3. Create or copy your existing key

---

## Step 2: Configure VectorGit

### Create .env file
```bash
cp .env.example .env
```

### Edit .env
```
OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY-HERE
```

Replace `YOUR-KEY-HERE` with your actual OpenRouter API key.

---

## Step 3: Test It

```bash
npm install
node cli.js init
node cli.js analyze
node cli.js commit
```

---

## 🎯 How OpenRouter Integration Works

```
VectorGit Code
    ↓
embedder.js (uses OpenAI SDK)
    ↓
OpenRouter API (baseURL: https://openrouter.ai/api/v1)
    ↓
Model: openai/text-embedding-3-small
    ↓
1536-dimensional embeddings
```

### Key Details
- **SDK**: Uses OpenAI SDK but configured for OpenRouter
- **Base URL**: `https://openrouter.ai/api/v1`
- **Model**: `openai/text-embedding-3-small`
- **Auth**: Via `OPENROUTER_API_KEY` environment variable

---

## 💰 Cost & Usage

### Pricing
- OpenRouter passes through provider pricing
- text-embedding-3-small costs ~$0.02 per 1M tokens
- Typical analysis: <$0.001 per commit

### Usage Tracking
- View usage at: https://openrouter.ai/dashboard
- Real-time stats available
- No surprise charges

### Credits & Limits
- Check your account balance: https://openrouter.ai/account
- Set usage limits if needed
- Monitor API keys in dashboard

---

## 🔧 Advanced Configuration

### Headers (Already Set)
```javascript
defaultHeaders: {
  'HTTP-Referer': 'https://github.com/yourusername/vectorgit',
  'X-Title': 'VectorGit'
}
```

These help OpenRouter track your usage properly.

### Available Models
OpenRouter supports many embedding models. Current config uses:
- `openai/text-embedding-3-small` (default)

To use different models, edit `embedder.js`:
```javascript
model: 'openai/text-embedding-3-large',  // More powerful
// or
model: 'cohere/embed-english-v3.0',       // Alternative
```

---

## ❓ Troubleshooting

### Error: "OPENROUTER_API_KEY not set"
**Solution:** Make sure `.env` file exists and contains your key
```bash
cat .env
# Should show: OPENROUTER_API_KEY=sk-or-v1-...
```

### Error: "401 Unauthorized"
**Solution:** Your API key is invalid or expired
1. Check key format (should start with `sk-or-v1-`)
2. Verify key in dashboard at https://openrouter.ai/dashboard
3. Generate a new key if needed

### Error: "429 Too Many Requests"
**Solution:** Rate limited
- Wait a moment and retry
- Check your usage limits
- Consider upgrading your OpenRouter plan

### Slow Embeddings
**Solution:** OpenRouter latency varies
- Typical: 1-5 seconds for 100 functions
- Check OpenRouter status: https://status.openrouter.ai

---

## 📊 Monitoring

### Check Usage
```bash
# Visit dashboard
# https://openrouter.ai/dashboard

# View stats:
# - Total API calls
# - Tokens used
# - Cost breakdown
# - Current balance
```

### Set Alerts
In OpenRouter dashboard:
- Set usage limits
- Enable email notifications
- Monitor API key activity

---

## 🔐 Security

### Protect Your API Key
✅ **Do:**
- Store in `.env` (git-ignored)
- Use environment variables
- Regenerate if compromised
- Rotate regularly

❌ **Don't:**
- Commit `.env` to git
- Share your key
- Use in client-side code
- Log your key

### Key Rotation
If you suspect compromise:
1. Go to OpenRouter dashboard
2. Delete the compromised key
3. Create a new key
4. Update `.env` in your project

---

## 📝 File References

### Modified Files
- `embedder.js` - Uses OpenRouter API
- `.env.example` - Updated with OPENROUTER_API_KEY

### No Changes Needed
- `parser.js` - Still uses Babel
- `comparator.js` - Still uses cosine similarity
- `store.js` - Still uses JSON storage
- `cli.js` - Still routes commands

---

## 🚀 Ready to Go!

Your VectorGit is now configured to use OpenRouter:

```bash
# Quick test
npm install
cp .env.example .env
# Edit .env with your key
node cli.js init
node cli.js analyze
```

**All set!** 🎉

---

## 📞 Support

**OpenRouter Help:** https://openrouter.ai/docs
**VectorGit Issues:** Check GETTING_STARTED.md

For more details on VectorGit, see:
- `README.md` - Full documentation
- `ARCHITECTURE.md` - System design
- `GETTING_STARTED.md` - Setup guide
