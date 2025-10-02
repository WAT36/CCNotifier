import GraphCard from "./GraphCard";

interface GraphGridProps {
  graphs: Array<{
    id: string;
    title: string;
    children?: React.ReactNode;
  }>;
  columnsPerRow?: number; // 1行あたりの列数（デフォルト: 3）
}

export default function GraphGrid({ graphs, columnsPerRow = 3 }: GraphGridProps) {
  // グラフを指定された列数ごとに分割
  const graphRows = [];
  for (let i = 0; i < graphs.length; i += columnsPerRow) {
    graphRows.push(graphs.slice(i, i + columnsPerRow));
  }

  return (
    <>
      <div className="graph-grid-container">
        {graphRows.map((row, rowIndex) => (
          <div key={rowIndex} className="graph-grid-row">
            {row.map((graph) => (
              <GraphCard key={graph.id} title={graph.title}>
                {graph.children}
              </GraphCard>
            ))}
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .graph-grid-container {
          margin-top: 1rem;
        }
        
        .graph-grid-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .graph-grid-row:last-child {
          margin-bottom: 0;
        }
        
        @media (max-width: 768px) {
          .graph-grid-row {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 1024px) and (min-width: 769px) {
          .graph-grid-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  );
}
