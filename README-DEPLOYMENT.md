# Vyuhaa Data Dataroom - Google VM Deployment Guide

## 🚀 Quick Setup on Google Cloud VM

### 1. Create Google Cloud VM
```bash
# Create a VM instance
gcloud compute instances create vyuhaa-dataroom \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --network-tier=PREMIUM \
    --maintenance-policy=MIGRATE \
    --service-account=YOUR_SERVICE_ACCOUNT \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --image-family=ubuntu-2004-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=20GB \
    --boot-disk-type=pd-standard \
    --tags=http-server,https-server,dataroom

# Allow HTTP traffic
gcloud compute firewall-rules create allow-dataroom \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --target-tags dataroom
```

### 2. SSH into VM and Deploy
```bash
# SSH into your VM
gcloud compute ssh vyuhaa-dataroom --zone=us-central1-a

# Make deployment script executable and run
chmod +x deploy-vm.sh
./deploy-vm.sh
```

### 3. Alternative Manual Setup

If you prefer manual setup:

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/vyuhaa-dataroom.git
cd vyuhaa-dataroom

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies and build
npm install
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start the application
pm2 start npm --name "vyuhaa-dataroom" -- run preview

# Save PM2 configuration
pm2 save
pm2 startup
```

## 📁 Simplified File Upload Process

### What's Changed:
✅ **All fields are now optional except file and name**  
✅ **Streamlined interface** - no complex categorization required  
✅ **Drag & drop support** for easy file uploads  
✅ **Quick upload** - just select file, name it, and upload  

### Upload Flow:
1. Click "Upload Document" button
2. Select file from your computer
3. File name auto-fills from filename
4. Optionally add category/description/tags
5. Click "Upload" - Done!

## 🔧 Configuration

### Environment Variables
Create a `.env` file in your project root:
```
VITE_SUPABASE_URL=https://rzhjagwjxkjlhwmpysxa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Setup
1. Disable email confirmation for easier testing:
   - Go to Supabase Dashboard > Authentication > Settings
   - Turn OFF "Enable email confirmations"

2. Set correct site URLs:
   - Site URL: `http://YOUR_VM_IP:3000`
   - Redirect URLs: `http://YOUR_VM_IP:3000`

## 🌐 Access Your Dataroom

After deployment, access your dataroom at:
```
http://YOUR_VM_EXTERNAL_IP:3000
```

### First Time Setup:
1. **Sign up** - First user becomes admin automatically
2. **Upload documents** - Use the simplified upload interface
3. **Create users** - Add team members via Users page
4. **Assign access** - Control who sees which documents

## 📊 Management Commands

```bash
# Check application status
docker-compose ps

# View logs
docker-compose logs -f

# Restart application
docker-compose restart

# Stop application
docker-compose down

# Update application
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

## 🔒 Security Notes

- VM firewall only allows ports 22 (SSH) and 3000 (app)
- All document uploads are secured via Supabase RLS
- Admin controls all user access and permissions
- Audit trail tracks all document downloads

## 📞 Support

If you encounter issues:
1. Check logs: `docker-compose logs`
2. Verify Supabase connection
3. Ensure firewall allows port 3000
4. Check VM external IP is accessible