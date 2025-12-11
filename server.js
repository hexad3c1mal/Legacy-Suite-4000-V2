const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const chokidar = require('chokidar');

let server;

function generatePlaylist(tempDir) {
  try {
    const musicDir = path.join(__dirname, 'music');
    const playlistPath = path.join(tempDir, 'playlist.json');
    
    if (!fs.existsSync(musicDir)) {
      console.warn('Music folder not found, creating empty playlist');
      fs.writeFileSync(playlistPath, JSON.stringify({ tracks: [] }, null, 2));
      return;
    }

    // Scan music folder for audio files
    const supportedExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'];
    const tracks = [];
    
    const files = fs.readdirSync(musicDir);
    for (const file of files) {
      const filePath = path.join(musicDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          tracks.push({
            filename: file,
            path: `music/${file}`,
            title: path.basename(file, ext).replace(/^\d+\s*-\s*/, ''), // Remove track numbers
            duration: null // Could be populated with audio metadata if needed
          });
        }
      }
    }

    // Sort tracks alphabetically by title
    tracks.sort((a, b) => a.title.localeCompare(b.title));

    const playlist = {
      generated: new Date().toISOString(),
      trackCount: tracks.length,
      tracks: tracks
    };

    fs.writeFileSync(playlistPath, JSON.stringify(playlist, null, 2));
    console.log(`Generated playlist with ${tracks.length} tracks`);
    
  } catch (error) {
    console.error('Failed to generate playlist:', error.message);
  }
}

function startDevServer() {
  const expressApp = express();
  const port = 3000;

  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Cleanup old radar files
  try {
    const files = fs.readdirSync(tempDir).filter(f => f.startsWith('radar_'));
    files.forEach(file => {
      fs.unlinkSync(path.join(tempDir, file));
    });
    console.log(`Startup cleanup: removed ${files.length} old radar files`);
  } catch (error) {
    console.warn('Startup cleanup failed:', error.message);
  }

  // Generate playlist.json from music folder
  generatePlaylist(tempDir);

  expressApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  let sseClients = [];

  expressApp.use(express.static(__dirname));

  expressApp.get('/live-reload', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    sseClients.push(res);
    res.write('data: connected\n\n');

    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== res);
    });
  });

  const watcher = chokidar.watch([
    '*.html', '*.css', '*.js', '*.json'
  ], {
    ignored: /node_modules/,
    ignoreInitial: true
  });

  watcher.on('change', (filePath) => {
    console.log(`File changed: ${filePath} - triggering reload`);
    
    sseClients.forEach(client => {
      try {
        client.write(`data: reload\n\n`);
      } catch (err) {
        sseClients = sseClients.filter(c => c !== client);
      }
    });
  });

  expressApp.get('/api/config', (req, res) => {
    try {
      const configData = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
      res.json(JSON.parse(configData));
    } catch (error) {
      console.error('Config read error:', error.message);
      res.status(500).json({ error: 'Could not read config file' });
    }
  });

  expressApp.get('/api/playlist', (req, res) => {
    try {
      const playlistPath = path.join(__dirname, 'temp', 'playlist.json');
      if (fs.existsSync(playlistPath)) {
        const playlistData = fs.readFileSync(playlistPath, 'utf8');
        res.json(JSON.parse(playlistData));
      } else {
        res.json({ tracks: [], trackCount: 0, generated: null });
      }
    } catch (error) {
      console.error('Playlist read error:', error.message);
      res.status(500).json({ error: 'Could not read playlist file' });
    }
  });

  expressApp.get('/api/radar/download', async (req, res) => {
    try {
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = Date.now();
      const filename = `radar_${timestamp}.png`;
      const filePath = path.join(tempDir, filename);

      const compositeUrls = [
        'https://stratospheregroup.me/final.png',  // Primary source
        'http://apollo.us.com:8008/radar_composite.png'  // Fallback
      ];

      for (let i = 0; i < compositeUrls.length; i++) {
        const url = compositeUrls[i];
        console.log(`Attempting composite radar source ${i + 1}: ${url}`);
        
        try {
          const success = await downloadImage(url, filePath);
          if (success) {
            console.log('Composite radar downloaded successfully');
            return res.json({
              success: true,
              imagePath: `/temp/${filename}`,
              timestamp: timestamp,
              source: 'composite',
              fileSize: fs.statSync(filePath).size
            });
          }
        } catch (error) {
          console.error(`Composite source ${i + 1} failed:`, error.message);
        }
      }

      console.log('Falling back to NOAA radar method');
      
      let cfg = {};
      try {
        const configData = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
        cfg = JSON.parse(configData);
      } catch (error) {
        console.warn('Config load failed for radar dimensions:', error.message);
      }
      
      const WIDTH = Number.isFinite(Number(cfg.radar_map_width)) ? Number(cfg.radar_map_width) : 7066;
      const HEIGHT = Number.isFinite(Number(cfg.radar_map_height)) ? Number(cfg.radar_map_height) : 4248;
      
      const radarUrl = `https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&TILED=false&LAYERS=conus_bref_qcd&WIDTH=${WIDTH}&HEIGHT=${HEIGHT}&SRS=EPSG%3A4326&BBOX=-127.680%2C21.649%2C-66.507%2C50.434`;

      console.log('Downloading NOAA radar data');

      const file = fs.createWriteStream(filePath);
      const request = https.get(radarUrl, (response) => {
        if (response.statusCode !== 200) {
          console.error('NOAA radar download failed:', response.statusCode, response.statusMessage);
          file.close();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return res.status(500).json({ 
            success: false, 
            error: `HTTP ${response.statusCode}: ${response.statusMessage}` 
          });
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('NOAA radar data downloaded successfully');
          cleanupOldRadarFiles(tempDir);

          res.json({
            success: true,
            imagePath: `/temp/${filename}`,
            timestamp: timestamp,
            source: 'noaa',
            fileSize: fs.statSync(filePath).size
          });
        });

        file.on('error', (error) => {
          console.error('File write error:', error.message);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          res.status(500).json({ success: false, error: error.message });
        });
      });

      request.on('error', (error) => {
        console.error('NOAA radar request error:', error.message);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        res.status(500).json({ success: false, error: error.message });
      });

      request.setTimeout(30000, () => {
        console.error('NOAA radar download timeout');
        request.destroy();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        res.status(500).json({ success: false, error: 'Download timeout' });
      });

    } catch (error) {
      console.error('Radar download endpoint error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  function downloadImage(url, filePath) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;
      const file = fs.createWriteStream(filePath);
      
      const request = protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(true);
        });

        file.on('error', (error) => {
          file.close();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(error);
        });
      });

      request.on('error', (error) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(error);
      });

      request.setTimeout(15000, () => {
        request.destroy();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(new Error('Download timeout'));
      });
    });
  }

  function cleanupOldRadarFiles(tempDir) {
    try {
      const files = fs.readdirSync(tempDir)
        .filter(f => f.startsWith('radar_'))
        .map(f => ({
          name: f,
          path: path.join(tempDir, f),
          timestamp: parseInt(f.split('_')[1].split('.')[0])
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (files.length > 5) {
        files.slice(5).forEach(file => {
          fs.unlinkSync(file.path);
          console.log('Radar Image', file.name, ' has expired, so it has been deleted.');
        });
      }
    } catch (cleanupError) {
      console.warn('Houston, we have a problem. ', cleanupError.message);
    }
  }

  expressApp.use('/temp', express.static(path.join(__dirname, 'temp')));

  expressApp.post('/api/save-config', express.json(), async (req, res) => {
    try {
      const newConfig = req.body;
      fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(newConfig, null, 2));
      res.json({ success: true, message: 'Configuration saved successfully' });
    } catch (error) {
      console.error('Config save error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Modern mode Mapbox basemap endpoint
  expressApp.get('/api/radar/mapbox-basemap', async (req, res) => {
    try {
      const { lat, lon, zoom = 10 } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
      }

      let cfg = {};
      try {
        const configData = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
        cfg = JSON.parse(configData);
      } catch (error) {
        console.warn('Config load failed for Mapbox token:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to load Mapbox configuration' });
      }

      const mapboxToken = cfg.api?.mapbox;
      if (!mapboxToken) {
        return res.status(500).json({ success: false, error: 'Mapbox API token not configured' });
      }

      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = Date.now();
      const filename = `mapbox_basemap_${timestamp}.png`;
      const filePath = path.join(tempDir, filename);

      // Mapbox static image URL with the user coordinates
      const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v9/static/${lon},${lat},${zoom},0,0/1280x1280?access_token=${mapboxToken}`;
      
      console.log('Downloading Mapbox basemap:', mapboxUrl);

      const success = await downloadImage(mapboxUrl, filePath);
      if (success) {
        console.log('Mapbox basemap downloaded successfully');
        res.json({
          success: true,
          imagePath: `/temp/${filename}`,
          timestamp: timestamp,
          source: 'mapbox',
          fileSize: fs.statSync(filePath).size
        });
      } else {
        res.status(500).json({ success: false, error: 'Failed to download Mapbox basemap' });
      }

    } catch (error) {
      console.error('Mapbox basemap endpoint error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // RSS feed endpoint for ad crawl
  expressApp.post('/api/rss-feed', express.json(), async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ success: false, error: 'RSS URL is required' });
      }

      console.log('Fetching RSS feed:', url);
      
      // Determine protocol
      const protocol = url.startsWith('https://') ? https : http;
      
      // Fetch RSS feed
      const request = protocol.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            // Simple RSS parsing - extract titles between <title> tags
            const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/gi;
            const items = [];
            let match;
            
            while ((match = titleRegex.exec(data)) !== null && items.length < 6) {
              const title = (match[1] || match[2] || '').trim();
              if (title && !title.toLowerCase().includes('rss')) { // Skip RSS feed title
                items.push({ title });
              }
            }
            
            console.log(`Parsed ${items.length} RSS items`);
            res.json({ success: true, items });
            
          } catch (parseError) {
            console.error('RSS parsing error:', parseError.message);
            res.status(500).json({ success: false, error: 'Failed to parse RSS feed' });
          }
        });
      });
      
      request.on('error', (error) => {
        console.error('RSS fetch error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch RSS feed' });
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        res.status(408).json({ success: false, error: 'RSS fetch timeout' });
      });
      
    } catch (error) {
      console.error('RSS endpoint error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  server = expressApp.listen(port, () => {
    console.log(`Dev server running at http://localhost:${port}`);
    console.log('Hi Austin its running now :factoftheday:');
  });
}

// Start the server immediately
startDevServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  if (server) {
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});