import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {isInstalled ? (
              <Check className="w-8 h-8 text-primary" />
            ) : (
              <Smartphone className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle>
            {isInstalled ? 'App Installed!' : 'Install Wingrow Inventory'}
          </CardTitle>
          <CardDescription>
            {isInstalled
              ? 'The app is now installed on your device'
              : 'Install our app for quick access and offline functionality'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isInstalled && (
            <>
              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Install Now
                </Button>
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">How to install:</p>
                  <div className="space-y-2">
                    <p className="flex items-start gap-2">
                      <span className="font-semibold min-w-[80px]">iPhone:</span>
                      <span>Tap Share → Add to Home Screen</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="font-semibold min-w-[80px]">Android:</span>
                      <span>Tap menu (⋮) → Install app</span>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full"
          >
            {isInstalled ? 'Go to App' : 'Continue in Browser'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
