export const detectDeviceInfo = (userAgent, ipAddress) => {
    // Enhanced device detection with more detailed information
    const ua = userAgent.toLowerCase();
    
    // Device type detection
    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
        deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'tablet';
    }
    
    // OS detection
    let deviceOS = 'unknown';
    let platformVersion = 'Unknown';
    
    if (ua.includes('windows')) {
        deviceOS = 'windows';
        const match = ua.match(/windows nt (\d+\.\d+)/);
        if (match) platformVersion = match[1];
    } else if (ua.includes('mac os') || ua.includes('macintosh')) {
        deviceOS = 'mac';
        const match = ua.match(/mac os x (\d+[._]\d+)/);
        if (match) platformVersion = match[1].replace('_', '.');
    } else if (ua.includes('linux')) {
        deviceOS = 'linux';
        const match = ua.match(/linux[^)]*\)/);
        if (match) platformVersion = match[0];
    } else if (ua.includes('android')) {
        deviceOS = 'android';
        const match = ua.match(/android (\d+\.\d+)/);
        if (match) platformVersion = match[1];
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
        deviceOS = 'ios';
        const match = ua.match(/os (\d+[._]\d+)/);
        if (match) platformVersion = match[1].replace('_', '.');
    }
    
    // Device brand and model detection
    let deviceBrand = 'Unknown';
    let deviceModel = 'Unknown';
    let deviceManufacturer = 'Unknown';
    
    // iOS devices
    if (ua.includes('iphone')) {
        deviceBrand = 'Apple';
        deviceManufacturer = 'Apple';
        if (ua.includes('iphone')) deviceModel = 'iPhone';
        if (ua.includes('ipad')) deviceModel = 'iPad';
        
        // Detect specific iPhone models
        if (ua.includes('iphone')) {
            if (ua.includes('iphone 15')) deviceModel = 'iPhone 15';
            else if (ua.includes('iphone 14')) deviceModel = 'iPhone 14';
            else if (ua.includes('iphone 13')) deviceModel = 'iPhone 13';
            else if (ua.includes('iphone 12')) deviceModel = 'iPhone 12';
            else if (ua.includes('iphone 11')) deviceModel = 'iPhone 11';
            else if (ua.includes('iphone x')) deviceModel = 'iPhone X';
            else if (ua.includes('iphone 8')) deviceModel = 'iPhone 8';
            else if (ua.includes('iphone 7')) deviceModel = 'iPhone 7';
            else if (ua.includes('iphone 6')) deviceModel = 'iPhone 6';
            else if (ua.includes('iphone 5')) deviceModel = 'iPhone 5';
            else if (ua.includes('iphone 4')) deviceModel = 'iPhone 4';
            else if (ua.includes('iphone 3')) deviceModel = 'iPhone 3';
        }
        
        // Detect specific iPad models
        if (ua.includes('ipad')) {
            if (ua.includes('ipad pro')) deviceModel = 'iPad Pro';
            else if (ua.includes('ipad air')) deviceModel = 'iPad Air';
            else if (ua.includes('ipad mini')) deviceModel = 'iPad Mini';
            else deviceModel = 'iPad';
        }
    }
    
    // Android devices
    if (ua.includes('android')) {
        deviceManufacturer = 'Android';
        
        // Samsung devices
        if (ua.includes('samsung') || ua.includes('sm-')) {
            deviceBrand = 'Samsung';
            if (ua.includes('sm-')) {
                const match = ua.match(/sm-([a-z0-9]+)/i);
                if (match) deviceModel = `Galaxy ${match[1].toUpperCase()}`;
            }
        }
        // OnePlus devices
        else if (ua.includes('oneplus')) {
            deviceBrand = 'OnePlus';
            const match = ua.match(/oneplus[^)]*\)/);
            if (match) deviceModel = match[0];
        }
        // Xiaomi devices
        else if (ua.includes('mi ') || ua.includes('redmi')) {
            deviceBrand = 'Xiaomi';
            if (ua.includes('mi ')) deviceModel = 'Mi Series';
            else if (ua.includes('redmi')) deviceModel = 'Redmi Series';
        }
        // Google devices
        else if (ua.includes('pixel')) {
            deviceBrand = 'Google';
            deviceModel = 'Pixel';
        }
        // Huawei devices
        else if (ua.includes('huawei')) {
            deviceBrand = 'Huawei';
            deviceModel = 'Huawei';
        }
        // Generic Android
        else {
            deviceBrand = 'Android';
            deviceModel = 'Android Device';
        }
    }
    
    // Desktop devices
    if (deviceType === 'desktop') {
        if (deviceOS === 'windows') {
            deviceBrand = 'PC';
            deviceManufacturer = 'Various';
            deviceModel = 'Windows PC';
        } else if (deviceOS === 'mac') {
            deviceBrand = 'Apple';
            deviceManufacturer = 'Apple';
            deviceModel = 'Mac';
        } else if (deviceOS === 'linux') {
            deviceBrand = 'PC';
            deviceManufacturer = 'Various';
            deviceModel = 'Linux PC';
        }
    }
    
    // Browser detection with enhanced information
    let browser = 'Unknown';
    let browserVersion = 'Unknown';
    let browserEngine = 'Unknown';
    let browserEngineVersion = 'Unknown';
    
    if (ua.includes('chrome')) {
        browser = 'Chrome';
        const match = ua.match(/chrome\/(\d+)/);
        if (match) browserVersion = match[1];
        
        // Check if it's Chromium-based
        if (ua.includes('edg')) {
            browser = 'Edge';
            const edgeMatch = ua.match(/edg\/(\d+)/);
            if (edgeMatch) browserVersion = edgeMatch[1];
        } else if (ua.includes('opr') || ua.includes('opera')) {
            browser = 'Opera';
            const operaMatch = ua.match(/(?:opr|opera)\/(\d+)/);
            if (operaMatch) browserVersion = operaMatch[1];
        }
        
        browserEngine = 'Blink';
        const blinkMatch = ua.match(/blink\/(\d+)/);
        if (blinkMatch) browserEngineVersion = blinkMatch[1];
    } else if (ua.includes('firefox')) {
        browser = 'Firefox';
        const match = ua.match(/firefox\/(\d+)/);
        if (match) browserVersion = match[1];
        browserEngine = 'Gecko';
        const geckoMatch = ua.match(/gecko\/(\d+)/);
        if (geckoMatch) browserEngineVersion = geckoMatch[1];
    } else if (ua.includes('safari')) {
        browser = 'Safari';
        const match = ua.match(/version\/(\d+)/);
        if (match) browserVersion = match[1];
        browserEngine = 'WebKit';
        const webkitMatch = ua.match(/webkit\/(\d+)/);
        if (webkitMatch) browserEngineVersion = webkitMatch[1];
    } else if (ua.includes('edge')) {
        browser = 'Edge';
        const match = ua.match(/edge\/(\d+)/);
        if (match) browserVersion = match[1];
        browserEngine = 'EdgeHTML';
    }
    
    // Platform detection
    let platform = 'Unknown';
    if (ua.includes('windows')) {
        platform = 'Windows';
    } else if (ua.includes('mac os')) {
        platform = 'macOS';
    } else if (ua.includes('linux')) {
        platform = 'Linux';
    } else if (ua.includes('android')) {
        platform = 'Android';
    } else if (ua.includes('ios')) {
        platform = 'iOS';
    }
    
    return {
        deviceType,
        deviceOS,
        deviceModel,
        deviceBrand,
        deviceManufacturer,
        browser,
        browserVersion,
        browserEngine,
        browserEngineVersion,
        platform,
        platformVersion,
        userAgent,
        ipAddress
    };
};

export const getLocationFromIP = async (ipAddress) => {
    try {
        // You can integrate with services like ipapi.co, ipinfo.io, or MaxMind
        // For now, returning basic info
        if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
            return {
                country: 'Local',
                city: 'Local',
                region: 'Local',
                timezone: 'Local',
                latitude: null,
                longitude: null
            };
        }
        
        // Example with ipapi.co (free tier available)
        // const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        // const data = await response.json();
        // return {
        //     country: data.country_name || 'Unknown',
        //     city: data.city || 'Unknown',
        //     region: data.region || 'Unknown',
        //     timezone: data.timezone || 'Unknown',
        //     latitude: data.latitude || null,
        //     longitude: data.longitude || null
        // };
        
        return {
            country: 'Unknown',
            city: 'Unknown',
            region: 'Unknown',
            timezone: 'Unknown',
            latitude: null,
            longitude: null
        };
    } catch (error) {
        console.error('Error getting location from IP:', error);
        return {
            country: 'Unknown',
            city: 'Unknown',
            region: 'Unknown',
            timezone: 'Unknown',
            latitude: null,
            longitude: null
        };
    }
};
