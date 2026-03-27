import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Heading, Text, Button, Stack, Container } from "../ui";

const Header: React.FC = () => {
  const { isAuthenticated, user, logout, loading } = useAuth();

  return (
    <header className="bg-white shadow">
      <Container maxWidth="xl" padding="md" className="py-6">
        <Stack direction="horizontal" align="center" justify="between">
          <Stack direction="horizontal" align="center" gap={4}>
            <Link to="/" className="flex items-center space-x-3 group">
              <img
                src="/bod-logo.jpg"
                alt="Bracket of Death Logo"
                className="h-16 w-16 object-contain transition-transform group-hover:scale-105"
              />
              <div>
                <Heading level={1} className="!text-3xl text-gradient">
                  Bracket of Death
                </Heading>
                <Text size="sm" color="muted" className="italic">
                  Because Tennis
                </Text>
              </div>
            </Link>
          </Stack>

          <Stack direction="horizontal" align="center" gap={4}>
            {loading ? (
              <Text size="sm" color="muted">Loading...</Text>
            ) : isAuthenticated && user ? (
              <Stack direction="horizontal" align="center" gap={4}>
                <div className="text-sm">
                  <span className="text-gray-600">Welcome, </span>
                  <Link
                    to="/profile"
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {user.fullName || user.username}
                  </Link>
                  {user.isAdmin && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <Button variant="ghost" onClick={logout} size="sm">
                  Sign Out
                </Button>
              </Stack>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </Stack>
        </Stack>
      </Container>
    </header>
  );
};

export default Header;
