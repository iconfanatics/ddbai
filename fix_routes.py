import re

with open('frontend/src/pages/admin/RoutesConfig.tsx', 'r') as f:
    content = f.read()

# Replace the form block
new_form = """        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Country</label>
            <select className="w-full border-gray-300 rounded p-2 border" value={selectedFromCountry} onChange={e => { handleFromChange(e.target.value); setFormData({...formData, fromCountry: e.target.value}); }}>
              <option value="">Select origin</option>
              {fromCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Country</label>
            <select className="w-full border-gray-300 rounded p-2 border" value={selectedToCountry} onChange={e => { handleToChange(e.target.value); setFormData({...formData, toCountry: e.target.value}); }} disabled={!selectedFromCountry}>
              <option value="">Select destination</option>
              {toCountries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Visa Center / Location</label>
            <select className="w-full border-gray-300 rounded p-2 border" value={selectedCenter} onChange={e => { handleCenterChange(e.target.value); setFormData({...formData, visaCenter: e.target.value}); }} disabled={!selectedToCountry}>
              <option value="">Select center</option>
              {visaCenters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Visa Category</label>
            <select className="w-full border-gray-300 rounded p-2 border" value={selectedCategory} onChange={e => { handleCategoryChange(e.target.value); setFormData({...formData, visaCategory: e.target.value}); }} disabled={!selectedCenter}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sub Category</label>
            <select className="w-full border-gray-300 rounded p-2 border" value={selectedSubCategory} onChange={e => { setSelectedSubCategory(e.target.value); setFormData({...formData, subCategory: e.target.value}); }} disabled={!selectedCategory}>
              <option value="">Select sub category</option>
              {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>"""

# Remove old form block
content = re.sub(r'<div className="grid grid-cols-4 gap-4 mb-4">.*?</div>\s*</div>\s*<div>\s*<label className="block text-xs text-gray-500 mb-1">Schedule Date</label>', new_form.strip() + '\n          <div>\n            <label className="block text-xs text-gray-500 mb-1">Schedule Date</label>', content, flags=re.DOTALL)

with open('frontend/src/pages/admin/RoutesConfig.tsx', 'w') as f:
    f.write(content)
