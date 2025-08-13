"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const NotFound = () => {
    return (<div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-gray-400 text-6xl">🎾</span>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist. It might have been moved, 
            deleted, or you entered the wrong URL.
          </p>
        </div>
        
        <div className="space-y-4">
          <react_router_dom_1.Link to="/" className="btn btn-primary inline-flex items-center">
            <span className="mr-2">🏠</span>
            Back to Home
          </react_router_dom_1.Link>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <react_router_dom_1.Link to="/players" className="btn btn-secondary inline-flex items-center">
              <span className="mr-2">👥</span>
              View Players
            </react_router_dom_1.Link>
            
            <react_router_dom_1.Link to="/tournaments" className="btn btn-secondary inline-flex items-center">
              <span className="mr-2">🏆</span>
              View Tournaments
            </react_router_dom_1.Link>
            
            <react_router_dom_1.Link to="/results" className="btn btn-secondary inline-flex items-center">
              <span className="mr-2">📊</span>
              View Results
            </react_router_dom_1.Link>
          </div>
        </div>
      </div>
    </div>);
};
exports.default = NotFound;
//# sourceMappingURL=NotFound.js.map