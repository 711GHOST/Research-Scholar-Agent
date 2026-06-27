import React, { useState } from 'react'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import ChatIcon from '@mui/icons-material/Chat'
import InsightsIcon from '@mui/icons-material/Insights'
import PersonIcon from '@mui/icons-material/Person'

import DashboardLayout from '../components/Layout/DashboardLayout'
import Papers from '../components/Dashboard/Papers'
import Discover from '../components/Dashboard/Discover'
import Chatbot from '../components/Dashboard/Chatbot'
import Analytics from '../components/Dashboard/Analytics'
import Profile from '../components/Dashboard/Profile'

const NAV_ITEMS = [
  { key: 'library', label: 'My Library', icon: <LibraryBooksIcon /> },
  { key: 'discover', label: 'Discover Papers', icon: <TravelExploreIcon /> },
  { key: 'chatbot', label: 'Research Chat', icon: <ChatIcon /> },
  { key: 'analytics', label: 'Analytics', icon: <InsightsIcon /> },
  { key: 'profile', label: 'Profile', icon: <PersonIcon /> },
]

const Dashboard = () => {
  const [active, setActive] = useState('library')

  return (
    <DashboardLayout navItems={NAV_ITEMS} active={active} onChange={setActive}>
      {active === 'library' && <Papers onDiscover={() => setActive('discover')} />}
      {active === 'discover' && <Discover onImported={() => setActive('library')} />}
      {active === 'chatbot' && <Chatbot />}
      {active === 'analytics' && <Analytics />}
      {active === 'profile' && <Profile />}
    </DashboardLayout>
  )
}

export default Dashboard
