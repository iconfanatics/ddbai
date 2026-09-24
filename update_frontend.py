import re
import sys

def update_clients():
    with open('frontend/src/pages/agent/Clients.tsx', 'r') as f:
        content = f.read()

    # Imports
    content = content.replace("import { useState } from 'react';", "import { useState, useMemo } from 'react';\nimport { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';")

    # Remove old static arrays
    content = re.sub(r'// Restricted mock data based on initial configuration.*?(?=export default function Clients)', '', content, flags=re.DOTALL)

    # Rewrite state hooks
    new_hooks = """
  const [showAddClient, setShowAddClient] = useState(false);
  
  // Cascading states
  const [selectedFromCountry, setSelectedFromCountry] = useState("");
  const [selectedToCountry, setSelectedToCountry] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  // Derived options based on selections
  const fromCountries = useMemo(() => VISA_ROUTE_MASTER.map(c => c.name), []);
  
  const toCountries = useMemo(() => {
    if (!selectedFromCountry) return [];
    return VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry)?.toCountries.map(t => t.name) || [];
  }, [selectedFromCountry]);

  const visaCenters = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    return to?.centers.map(c => c.name) || [];
  }, [selectedFromCountry, selectedToCountry]);

  const categories = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    const center = to?.centers.find(c => c.name === selectedCenter);
    return center?.categories.map(c => c.name) || [];
  }, [selectedFromCountry, selectedToCountry, selectedCenter]);

  const subCategories = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter || !selectedCategory) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    const center = to?.centers.find(c => c.name === selectedCenter);
    const cat = center?.categories.find(c => c.name === selectedCategory);
    return cat?.subCategories || [];
  }, [selectedFromCountry, selectedToCountry, selectedCenter, selectedCategory]);

  const handleFromChange = (val: string) => { setSelectedFromCountry(val); setSelectedToCountry(""); setSelectedCenter(""); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleToChange = (val: string) => { setSelectedToCountry(val); setSelectedCenter(""); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleCenterChange = (val: string) => { setSelectedCenter(val); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleCategoryChange = (val: string) => { setSelectedCategory(val); setSelectedSubCategory(""); };
"""
    content = re.sub(r'const \[showAddClient.*?const activeVisaCenters.*?;', new_hooks.strip(), content, flags=re.DOTALL)

    # Rewrite Filter Section
    new_filters = """
        {/* Row 1 */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Country</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedFromCountry} onChange={e => handleFromChange(e.target.value)}>
              <option value="">All origins</option>
              {fromCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Country</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedToCountry} onChange={e => handleToChange(e.target.value)} disabled={!selectedFromCountry}>
              <option value="">All destinations</option>
              {toCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Center</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedCenter} onChange={e => handleCenterChange(e.target.value)} disabled={!selectedToCountry}>
              <option value="">All visa centers</option>
              {visaCenters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Category</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} disabled={!selectedCenter}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sub Category</label>
            <select className="w-full border-gray-300 rounded p-2 border text-sm" value={selectedSubCategory} onChange={e => setSelectedSubCategory(e.target.value)} disabled={!selectedCategory}>
              <option value="">All sub categories</option>
              {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
"""
    content = re.sub(r'\{\/\* Row 1 \*\/}.*?</div>\s*</div>\s*\{\/\* Row 2 \*\/}', new_filters.strip() + '\n        {/* Row 2 */}', content, flags=re.DOTALL)
    
    with open('frontend/src/pages/agent/Clients.tsx', 'w') as f:
        f.write(content)


def update_routes():
    with open('frontend/src/pages/admin/RoutesConfig.tsx', 'r') as f:
        content = f.read()

    # Imports
    content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect, useMemo } from 'react';\nimport { VISA_ROUTE_MASTER } from '../../data/visaRouteMaster';")

    # Remove old static arrays
    content = re.sub(r'const FROM_COUNTRIES.*?};', '', content, flags=re.DOTALL)

    # Rewrite state hooks
    new_hooks = """
  // Cascading states
  const [selectedFromCountry, setSelectedFromCountry] = useState("");
  const [selectedToCountry, setSelectedToCountry] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  
  // Other form fields
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Derived options based on selections
  const fromCountries = useMemo(() => VISA_ROUTE_MASTER.map(c => c.name), []);
  
  const toCountries = useMemo(() => {
    if (!selectedFromCountry) return [];
    return VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry)?.toCountries.map(t => t.name) || [];
  }, [selectedFromCountry]);

  const visaCenters = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    return to?.centers.map(c => c.name) || [];
  }, [selectedFromCountry, selectedToCountry]);

  const categories = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    const center = to?.centers.find(c => c.name === selectedCenter);
    return center?.categories.map(c => c.name) || [];
  }, [selectedFromCountry, selectedToCountry, selectedCenter]);

  const subCategories = useMemo(() => {
    if (!selectedFromCountry || !selectedToCountry || !selectedCenter || !selectedCategory) return [];
    const from = VISA_ROUTE_MASTER.find(c => c.name === selectedFromCountry);
    const to = from?.toCountries.find(t => t.name === selectedToCountry);
    const center = to?.centers.find(c => c.name === selectedCenter);
    const cat = center?.categories.find(c => c.name === selectedCategory);
    return cat?.subCategories || [];
  }, [selectedFromCountry, selectedToCountry, selectedCenter, selectedCategory]);

  const handleFromChange = (val: string) => { setSelectedFromCountry(val); setSelectedToCountry(""); setSelectedCenter(""); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleToChange = (val: string) => { setSelectedToCountry(val); setSelectedCenter(""); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleCenterChange = (val: string) => { setSelectedCenter(val); setSelectedCategory(""); setSelectedSubCategory(""); };
  const handleCategoryChange = (val: string) => { setSelectedCategory(val); setSelectedSubCategory(""); };

  const activeVisaCenters = visaCenters;
"""
    content = re.sub(r'const \[selectedFromCountry.*?const activeVisaCenters.*?;', new_hooks.strip(), content, flags=re.DOTALL)

    # Rewrite Filter Form
    new_form = """
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Country</label>
            <select className="w-full border-gray-300 rounded-md p-2 border" value={selectedFromCountry} onChange={e => handleFromChange(e.target.value)}>
              <option value="">Select origin</option>
              {fromCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Country</label>
            <select className="w-full border-gray-300 rounded-md p-2 border" value={selectedToCountry} onChange={e => handleToChange(e.target.value)} disabled={!selectedFromCountry}>
              <option value="">Select destination</option>
              {toCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visa Center</label>
            <select className="w-full border-gray-300 rounded-md p-2 border" value={selectedCenter} onChange={e => handleCenterChange(e.target.value)} disabled={!selectedToCountry}>
              <option value="">Select center</option>
              {visaCenters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visa Category</label>
            <select className="w-full border-gray-300 rounded-md p-2 border" value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} disabled={!selectedCenter}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
            <select className="w-full border-gray-300 rounded-md p-2 border" value={selectedSubCategory} onChange={e => setSelectedSubCategory(e.target.value)} disabled={!selectedCategory}>
              <option value="">Select sub-category</option>
              {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
"""
    content = re.sub(r'<div className="grid grid-cols-4 gap-4">.*?</div>\s*</div>\s*<div className="grid grid-cols-4 gap-4">', new_form.strip() + '\n        <div className="grid grid-cols-4 gap-4 mt-4">', content, flags=re.DOTALL)
    
    with open('frontend/src/pages/admin/RoutesConfig.tsx', 'w') as f:
        f.write(content)

update_clients()
update_routes()
