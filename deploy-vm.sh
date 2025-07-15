#!/bin/bash

# Vyuhaa Data Dataroom - Google VM Deployment Script
echo "🚀 Starting deployment of Vyuhaa Data Dataroom..."

# Update system
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get install git -y
fi

# Clone or pull the repository
REPO_DIR="vyuhaa-dataroom"
if [ -d "$REPO_DIR" ]; then
    echo "📥 Updating existing repository..."
    cd $REPO_DIR
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/lovable-dev/vyuhaa-dataroom.git
    cd $REPO_DIR
fi

# Create logs directory
mkdir -p logs

# Build and start the application
echo "🔨 Building and starting the application..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Show status
echo "✅ Deployment complete!"
echo "🌐 Your dataroom is now running at: http://$(curl -s ifconfig.me):3000"
echo "📊 Check logs with: docker-compose logs -f"
echo "🛑 Stop with: docker-compose down"

# Setup firewall (optional)
echo "🔥 Setting up firewall..."
sudo ufw allow 3000/tcp
sudo ufw allow ssh
sudo ufw --force enable

echo "🎉 Vyuhaa Data Dataroom is ready!"
echo "📝 Next steps:"
echo "   1. Access your app at http://$(curl -s ifconfig.me):3000"
echo "   2. Sign up as the first user to become admin"
echo "   3. Start uploading documents!"