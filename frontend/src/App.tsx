import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import About from './pages/About'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import Search from './pages/Search'
import Series from './pages/Series'
import Settings from './pages/Settings'
import Torrents from './pages/Torrents'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/torrents"    element={<Torrents />} />
        <Route path="/search"      element={<Search />} />
        <Route path="/library"     element={<Library />} />
        <Route path="/series"      element={<Series />} />
        <Route path="/settings/*"  element={<Settings />} />
        <Route path="/about"       element={<About />} />
      </Routes>
    </Layout>
  )
}
