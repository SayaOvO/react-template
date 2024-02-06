import { Suspense, use } from 'react';

const promise = new Promise<string>((resolve, reject) => {
  setTimeout(() => {
    resolve("Built with React and Rspack!");
  }, 3000);
});

export default function App() {
  return (
    <div>
      <Suspense fallback={<p>Loading</p>}>
        <Greeting p={promise} />
      </Suspense>
    </div>
  );
}

function Greeting({
  p,
}: {
  p: Promise<string>;
}) {
  const value = use(p);
  return <p>{value}</p>;
}
