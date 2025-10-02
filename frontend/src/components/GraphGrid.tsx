import GraphCard from "./GraphCard";

interface GraphGridProps {
  graphs: Array<{
    id: string;
    title: string;
    children?: React.ReactNode;
  }>;
}

export default function GraphGrid({ graphs }: GraphGridProps) {
  return (
    <>
      <div className="graph-grid">
        {graphs.map((graph) => (
          <GraphCard key={graph.id} title={graph.title}>
            {graph.children}
          </GraphCard>
        ))}
      </div>
      
      <style jsx>{`
        .graph-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-top: 1rem;
        }
        
        @media (max-width: 768px) {
          .graph-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 1024px) and (min-width: 769px) {
          .graph-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  );
}
