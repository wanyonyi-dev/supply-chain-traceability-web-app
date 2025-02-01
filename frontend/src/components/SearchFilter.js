import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './SearchFilter.css';

const SearchFilter = ({ onSearch, onFilter, filters }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    const { t } = useTranslation();

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        onSearch(value);
    };

    const handleFilterChange = (filterKey, value) => {
        const newFilters = {
            ...activeFilters,
            [filterKey]: value
        };
        setActiveFilters(newFilters);
        onFilter(newFilters);
    };

    return (
        <div className="search-filter-container">
            <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder={t('common.search')}
                className="search-input"
            />
            <div className="filters-group">
                {filters.map(filter => (
                    <select
                        key={filter.key}
                        onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                        className="filter-select"
                    >
                        <option value="">{filter.label}</option>
                        {filter.options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ))}
            </div>
        </div>
    );
};

export default SearchFilter; 