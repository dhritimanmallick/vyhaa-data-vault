import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Folder, FileText } from 'lucide-react';

interface FolderGridProps {
  dataRoomStructure: Record<string, string[]>;
  documentCounts: Record<string, number>;
  onFolderClick: (category: string) => void;
  selectedFolder: string | null;
}

export const FolderGrid: React.FC<FolderGridProps> = ({
  dataRoomStructure,
  documentCounts,
  onFolderClick,
  selectedFolder
}) => {
  const formatFolderName = (folderName: string) => {
    return folderName.replace(/^\d+_/, '').replace(/_/g, ' ');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Data Room Folders</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(dataRoomStructure).map((category) => (
          <Card 
            key={category}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
              selectedFolder === category 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => onFolderClick(category)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Folder 
                    className={`h-8 w-8 ${
                      selectedFolder === category ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm leading-tight">
                    {formatFolderName(category)}
                  </h4>
                  <div className="flex items-center mt-2 space-x-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="secondary" className="text-xs">
                      {documentCounts[category] || 0} files
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Subcategories preview */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  {dataRoomStructure[category].length} subcategories
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dataRoomStructure[category].slice(0, 2).map((sub) => (
                    <span 
                      key={sub}
                      className="text-xs text-muted-foreground bg-muted/30 px-1 py-0.5 rounded"
                    >
                      {formatFolderName(sub)}
                    </span>
                  ))}
                  {dataRoomStructure[category].length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{dataRoomStructure[category].length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};