import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Calendar,
  User
} from 'lucide-react';

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

interface DocumentsByCategory {
  [category: string]: Document[];
}

export const DocumentViewer: React.FC = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
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
      const { data, error } = await supabase.functions.invoke('download-document', {
        body: { documentId: document.id },
      });

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${document.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const formatFolderName = (name: string) => {
    return name.replace(/^\d+_/, '').replace(/_/g, ' ');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const documentsByCategory: DocumentsByCategory = filteredDocuments.reduce((acc, doc) => {
    const category = doc.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {} as DocumentsByCategory);

  // Get categories with document counts
  const categoriesWithCounts = Object.keys(dataRoomStructure).map(category => ({
    id: category,
    name: formatFolderName(category),
    count: documents.filter(doc => doc.category === category).length
  }));

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
        <h1 className="text-3xl font-bold mb-2">Document Viewer</h1>
        <p className="text-muted-foreground">Browse and download available documents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Folder Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={selectedCategory === null ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedCategory(null)}
              >
                <FileText className="mr-2 h-4 w-4" />
                All Documents
                <Badge variant="secondary" className="ml-auto">
                  {documents.length}
                </Badge>
              </Button>
              
              <Separator />
              
              {categoriesWithCounts.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  <span className="truncate">{category.name}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents Display */}
          {Object.keys(documentsByCategory).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory ? 'No documents match your criteria' : 'No documents available'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(documentsByCategory).map(([category, docs]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Folder className="mr-2 h-5 w-5" />
                      {formatFolderName(category)} ({docs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {docs.map((document) => (
                          <TableRow key={document.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{document.name}</p>
                                  {document.subcategory && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatFolderName(document.subcategory)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{document.description || '-'}</p>
                                {document.tags && document.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {document.tags.map((tag, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatFileSize(document.file_size)}</TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="mr-1 h-3 w-3" />
                                {new Date(document.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(document)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};