import SearchView from './SearchView';

export default async function CercaPage({ searchParams }) {
  const sp = await searchParams;
  return <SearchView fromSlug={sp.from} toSlug={sp.to} />;
}
