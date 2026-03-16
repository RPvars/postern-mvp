'use client';

import { useTranslations } from 'next-intl';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

export function DocumentsTab() {
  const t = useTranslations('company');

  return (
    <TabsContent value="documents">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t('documents.title')}
          </CardTitle>
          <CardDescription>
            {t('documents.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">
            {t('documents.comingSoon')}
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            {t('documents.comingSoonDescription')}
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
