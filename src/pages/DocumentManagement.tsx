import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  FileText, 
  Search,
  Folder,
  Upload,
  Eye,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { FolderGrid } from '@/components/FolderGrid';
import { FileDropZone } from '@/components/FileDropZone';
import { useAuth } from '@/contexts/AuthContext';

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  tags: string[] | null;
  category: string | null;
  subcategory: string | null;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
}

export default function DocumentManagement() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});

  // Define your data room structure
  const dataRoomStructure = {
    "01_Company_Overview": [
      "01_Pitch Deck",
      "02_One Pager", 
      "03_Company Profile",
      "04_Introductory Video"
    ],
    "02_Financials": [
      "01_Audited Financial Statements",
      "02_Management Accounts (YTD)",
      "03_Financial Model",
      "04_Projections & Assumptions"
    ],
    "03_Product_and_Technology": [
      "01_Product Brochures",
      "02_Technical Whitepapers", 
      "03_IP_Filings_and_Patents",
      "04_Roadmap"
    ],
    "04_Market_Information": [
      "01_Market Research Reports",
      "02_Competitor Analysis",
      "03_Regulatory Landscape"
    ],
    "05_Team_and_Organization": [
      "01_Founder_Bios",
      "02_Key_Team_CVs",
      "03_Organization_Structure",
      "04_Board_and_Advisors"
    ],
    "06_Legal_and_Compliance": [
      "01_Company Incorporation Documents",
      "02_MOA_AOA",
      "03_Trademark_and_IP_Documents",
      "04_Regulatory_Certifications"
    ],
    "07_Contracts_and_Agreements": [
      "01_Customer_Contracts",
      "02_Partner_Agreements",
      "03_NDAs_and_MOUs"
    ],
    "08_Investor_Communications": [
      "01_Existing_Investor_List",
      "02_Previous_Rounds_Details",
      "03_Cap Table",
      "04_Shareholding_Structure"
    ],
    "09_Other_Key_Documents": [
      "01_Awards_and_Media",
      "02_Impact_Case_Studies",
      "03_Additional_Reference_Materials"
    ]
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      
      // Calculate document counts by category
      const counts: Record<string, number> = {};
      data?.forEach(doc => {
        if (doc.category) {
          counts[doc.category] = (counts[doc.category] || 0) + 1;
        }
      });
      setDocumentCounts(counts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDownload = async (document: Document) => {
    try {
      console.log('Starting download for:', document.name);
      
      // Use fetch directly to get the binary response
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`https://rzhjagwjxkjlhwmpysxa.supabase.co/functions/v1/download-file-local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ documentId: document.id }),
      });

      console.log('Download response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download error response:', errorText);
        throw new Error(`Download failed: ${response.status} ${errorText}`);
      }

      // Get the binary data
      const blob = await response.blob();
      console.log('Downloaded blob size:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${document.name} (${Math.round(blob.size / 1024)} KB)`,
      });
    } catch (error: any) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (document: Document) => {
    if (!window.confirm(`Are you sure you want to delete "${document.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-file-local', {
        body: { documentId: document.id },
      });

      if (error) throw error;

      toast({
        title: "Document Deleted",
        description: `Successfully deleted ${document.name}`,
      });

      // Refresh the documents list
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFolder = !selectedFolder || doc.category === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatFolderName = (name: string) => {
    return name.replace(/^\d+_/, '').replace(/_/g, ' ');
  };

  const onUploadComplete = () => {
    fetchDocuments();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {isAdmin ? 'Document Management' : 'Document Viewer'}
            </h1>
            <p className="text-muted-foreground">
              {selectedFolder 
                ? `${isAdmin ? 'Managing' : 'Viewing'}: ${formatFolderName(selectedFolder)}` 
                : isAdmin 
                  ? 'Select a folder to upload documents or view all documents below'
                  : 'Browse and download available documents'
              }
            </p>
          </div>
          
          {selectedFolder && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedFolder(null)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Folders
            </Button>
          )}
        </div>
      </div>

      {!selectedFolder ? (
        /* Folder Grid View */
        <FolderGrid
          dataRoomStructure={dataRoomStructure}
          documentCounts={documentCounts}
          onFolderClick={setSelectedFolder}
          selectedFolder={selectedFolder}
        />
      ) : (
        /* Selected Folder View */
        <div className={`grid grid-cols-1 gap-6 ${isAdmin ? 'xl:grid-cols-2' : ''}`}>
          {/* Upload Zone - Only for Admins */}
          {isAdmin && (
            <div>
              <FileDropZone
                selectedFolder={selectedFolder}
                dataRoomStructure={dataRoomStructure}
                onUploadComplete={onUploadComplete}
              />
            </div>
          )}

          {/* Documents in this folder */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Folder className="mr-2 h-5 w-5" />
                  Documents in {formatFolderName(selectedFolder)}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No documents match your search' : 'No documents in this folder yet'}
                    </p>
                    {isAdmin && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Drag and drop files to the upload area to get started
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDocuments.map((document) => (
                      <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{document.name}</p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(document.file_size)}</span>
                              <span>•</span>
                              <span>{new Date(document.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {document.tags && document.tags.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {document.tags.length} tag{document.tags.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            title="Download document"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(document)}
                              title="Delete document"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* All Documents Overview */}
      {!selectedFolder && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              All Documents ({documents.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No documents match your search' : 'No documents uploaded yet'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">{document.name}</TableCell>
                      <TableCell>
                        {document.category ? (
                          <Badge variant="secondary">
                            {formatFolderName(document.category)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(document.file_size)}</TableCell>
                      <TableCell>
                        {new Date(document.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            title="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(document)}
                              title="Delete document"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}