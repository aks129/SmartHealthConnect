import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Paintbrush,
  Building2,
  Check,
  Settings2,
  Palette,
  Eye,
  Sparkles
} from 'lucide-react';
import { useBrand, brandThemes, type BrandTheme } from './BrandProvider';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface BrandSwitcherProps {
  trigger?: React.ReactNode;
}

export function BrandSwitcher({ trigger }: BrandSwitcherProps) {
  const { currentBrand, setBrand } = useBrand();
  const [selectedBrand, setSelectedBrand] = useState(currentBrand.id);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleApply = () => {
    setBrand(selectedBrand);
    setOpen(false);
  };

  const content = (
    <div className="space-y-6">
      {/* Demo Mode Notice */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">
              White-Label Demo Mode
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Select a brand theme to preview how the platform can be customized for different healthcare organizations.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets" className="gap-2">
            <Palette className="h-4 w-4" />
            Preset Themes
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            {brandThemes.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                isSelected={selectedBrand === brand.id}
                isCurrent={currentBrand.id === brand.id}
                onClick={() => setSelectedBrand(brand.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <PreviewPanel selectedBrand={brandThemes.find(b => b.id === selectedBrand)!} />
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          disabled={selectedBrand === currentBrand.id}
        >
          Apply Theme
        </Button>
      </div>
    </div>
  );

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Paintbrush className="h-4 w-4" />
      <span className="hidden sm:inline">Brand Theme</span>
    </Button>
  );

  // Use Sheet for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || defaultTrigger}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Brand Configuration
            </SheetTitle>
            <SheetDescription>
              Customize the platform appearance for your organization
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Brand Configuration
          </DialogTitle>
          <DialogDescription>
            Customize the platform appearance for your organization
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

interface BrandCardProps {
  brand: BrandTheme;
  isSelected: boolean;
  isCurrent: boolean;
  onClick: () => void;
}

function BrandCard({ brand, isSelected, isCurrent, onClick }: BrandCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all overflow-hidden',
          isSelected
            ? 'ring-2 ring-primary border-primary'
            : 'hover:border-primary/50'
        )}
        onClick={onClick}
      >
        <CardContent className="p-0">
          {/* Color preview bar */}
          <div
            className="h-12 flex items-center justify-center"
            style={{ backgroundColor: brand.colors.primary }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: brand.colors.primaryForeground }}
            >
              {brand.name}
            </span>
          </div>

          {/* Brand info */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{brand.name}</span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Check className="h-4 w-4 text-primary" />
                </motion.div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{brand.description}</p>

            {/* Color swatches */}
            <div className="flex gap-1 mt-2">
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: brand.colors.primary }}
                title="Primary"
              />
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: brand.colors.accent }}
                title="Accent"
              />
            </div>

            {isCurrent && (
              <Badge variant="secondary" className="mt-2 text-xs">
                Currently Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface PreviewPanelProps {
  selectedBrand: BrandTheme;
}

function PreviewPanel({ selectedBrand }: PreviewPanelProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Preview Components</h4>

      {/* Preview card with selected brand colors */}
      <Card
        className="overflow-hidden"
        style={{ borderColor: selectedBrand.colors.primary }}
      >
        <div
          className="p-4"
          style={{ backgroundColor: `${selectedBrand.colors.primary}10` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: selectedBrand.colors.primary }}
            >
              <Building2
                className="h-6 w-6"
                style={{ color: selectedBrand.colors.primaryForeground }}
              />
            </div>
            <div>
              <h3 className="font-semibold">{selectedBrand.name} Health</h3>
              <p className="text-sm text-muted-foreground">Healthcare Platform</p>
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Button preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Buttons</Label>
            <div className="flex gap-2 flex-wrap">
              <button
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: selectedBrand.colors.primary,
                  color: selectedBrand.colors.primaryForeground,
                }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-md text-sm font-medium border transition-colors"
                style={{
                  borderColor: selectedBrand.colors.primary,
                  color: selectedBrand.colors.primary,
                }}
              >
                Outline Button
              </button>
            </div>
          </div>

          {/* Badge preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Badges</Label>
            <div className="flex gap-2 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: selectedBrand.colors.primary,
                  color: selectedBrand.colors.primaryForeground,
                }}
              >
                Active
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${selectedBrand.colors.accent}20`,
                  color: selectedBrand.colors.accent,
                }}
              >
                Scheduled
              </span>
            </div>
          </div>

          {/* Progress preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Progress</Label>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full w-3/4 rounded-full transition-all"
                style={{ backgroundColor: selectedBrand.colors.primary }}
              />
            </div>
          </div>

          {/* Link preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Links</Label>
            <p className="text-sm">
              View your{' '}
              <span
                className="underline cursor-pointer"
                style={{ color: selectedBrand.colors.primary }}
              >
                health records
              </span>{' '}
              or{' '}
              <span
                className="underline cursor-pointer"
                style={{ color: selectedBrand.colors.accent }}
              >
                schedule an appointment
              </span>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick brand toggle for demo purposes (can be placed in header)
export function QuickBrandToggle() {
  const { currentBrand, setBrand, availableBrands } = useBrand();

  const cycleToNextBrand = () => {
    const currentIndex = availableBrands.findIndex(b => b.id === currentBrand.id);
    const nextIndex = (currentIndex + 1) % availableBrands.length;
    setBrand(availableBrands[nextIndex].id);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleToNextBrand}
      className="relative"
      title={`Current: ${currentBrand.name}. Click to cycle themes.`}
    >
      <div
        className="w-5 h-5 rounded-full border-2 border-background shadow-sm"
        style={{ backgroundColor: currentBrand.colors.primary }}
      />
    </Button>
  );
}
