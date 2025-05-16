import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { List, ListItem, ListItemText, IconButton, Tooltip, Collapse } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

function BurgerMenu() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = () => setIsExpanded(!isExpanded);
  const toggleSubMenu = (menuKey) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const menuItems = [
   {
    label: 'AI Model',
    subItems: [
      { label: 'Dojo', path: '/model' },
      { label: 'Analyzer', path: '/analyzer' },
	  { label: 'Label Studio', path: '/labelstudio' },
      { label: 'Automation', path: '/automation' }
    ]
    },
	{
      label: 'WAGO AI Apps',
      subItems: [
        { label: 'Visual Inference', path: '/visual-inference' },
        { label: 'Chat', path: '/chat' },
        { label: 'Conversation', path: '/conversation' },
        {
          label: 'WagoAppAnalytics',
          subItems: [
            { label: 'Grafana', path: '/visualization' },
			{ label: 'Node-RED', path: '/nodered' }
          ]
        }
      ]
    },
    {
      label: 'Custom AI Apps',
      subItems: [
        { label: 'Audio Inference', path: '/audio-inference' },
        { label: 'Partner App', path: '/partner' }
      ]
    },
    { label: 'Dataflow', path: '/dataflow' },
    { label: 'Status', path: '/status' },
    { label: 'Configuration', path: '/configuration' },
    { label: 'Help', path: '/help' },
    { label: 'Impressum', path: '/impressum' }
  ];

  return (
    <div
      style={{
        width: isExpanded ? '300px' : '60px',
        transition: 'width 0.3s ease',
        backgroundColor: '#f0f0f0',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingTop: '20px',
        paddingLeft: '10px',
      }}
    >
      <Tooltip title="Click to open/close the menu" arrow>
        <IconButton onClick={toggleMenu}>
          {isExpanded ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      </Tooltip>

      {isExpanded && (
        <List sx={{ width: '100%' }}>
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              {item.subItems ? (
                <>
                  <ListItem onClick={() => toggleSubMenu(item.label)} sx={{ cursor: 'pointer' }}>
                    <ListItemText primary={item.label} />
                    {openMenus[item.label] ? <ExpandLess /> : <ExpandMore />}
                  </ListItem>
                  <Collapse in={openMenus[item.label]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem, subIndex) => (
                        <React.Fragment key={subIndex}>
                          {subItem.subItems ? (
                            <>
                              <ListItem onClick={() => toggleSubMenu(subItem.label)} sx={{ pl: 4, cursor: 'pointer' }}>
                                <ListItemText primary={subItem.label} />
                                {openMenus[subItem.label] ? <ExpandLess /> : <ExpandMore />}
                              </ListItem>
                              <Collapse in={openMenus[subItem.label]} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                  {subItem.subItems.map((nestedItem) => (
                                    <ListItem
                                      key={nestedItem.label}
                                      component={NavLink}
                                      to={nestedItem.path}
                                      sx={{ pl: 6 }}
                                    >
                                      <ListItemText primary={nestedItem.label} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Collapse>
                            </>
                          ) : (
                            <ListItem
                              component={NavLink}
                              to={subItem.path}
                              sx={{ pl: 4 }}
                            >
                              <ListItemText primary={subItem.label} />
                            </ListItem>
                          )}
                        </React.Fragment>
                      ))}
                    </List>
                  </Collapse>
                </>
              ) : (
                <ListItem component={NavLink} to={item.path}>
                  <ListItemText primary={item.label} />
                </ListItem>
              )}
            </React.Fragment>
          ))}
        </List>
      )}
    </div>
  );
}

export default BurgerMenu;