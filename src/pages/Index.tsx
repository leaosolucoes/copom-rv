import { Header } from "@/components/layout/Header";
import { PublicComplaintForm } from "@/components/complaints/PublicComplaintForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <div className="container mx-auto">
          <PublicComplaintForm />
        </div>
      </main>
    </div>
  );
};

export default Index;
