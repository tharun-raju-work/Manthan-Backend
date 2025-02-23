#!/bin/bash

# Directory for SSL certificates
SSL_DIR="/etc/ssl/private"

# Create directory if it doesn't exist
sudo mkdir -p $SSL_DIR

# Generate SSL certificate using Let's Encrypt
sudo certbot certonly \
  --standalone \
  --preferred-challenges http \
  --agree-tos \
  --email your-email@domain.com \
  -d your-domain.com \
  -d www.your-domain.com

# Copy certificates to application directory
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem $SSL_DIR/
sudo cp /etc/letsencrypt/live/your-domain.com/cert.pem $SSL_DIR/
sudo cp /etc/letsencrypt/live/your-domain.com/chain.pem $SSL_DIR/

# Set proper permissions
sudo chmod 600 $SSL_DIR/*.pem

# Create renewal hook
cat << EOF > /etc/letsencrypt/renewal-hooks/post/copy-certs.sh
#!/bin/bash
cp /etc/letsencrypt/live/your-domain.com/privkey.pem $SSL_DIR/
cp /etc/letsencrypt/live/your-domain.com/cert.pem $SSL_DIR/
cp /etc/letsencrypt/live/your-domain.com/chain.pem $SSL_DIR/
chmod 600 $SSL_DIR/*.pem
systemctl restart your-app
EOF

chmod +x /etc/letsencrypt/renewal-hooks/post/copy-certs.sh 