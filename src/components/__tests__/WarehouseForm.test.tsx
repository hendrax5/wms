import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WarehouseForm from '../WarehouseForm';
import { vi, describe, it, expect } from 'vitest';

describe('WarehouseForm', () => {
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();
    const areas = [{ id: 1, name: 'Area 1' }];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the form with default values correctly', () => {
        render(<WarehouseForm areas={areas} onClose={mockOnClose} onSubmit={mockOnSubmit} />);

        expect(screen.getByText('Tambah Gudang Baru')).toBeInTheDocument();
        expect(screen.getByLabelText(/Nama Gudang\/Cabang/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Tipe Gudang/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Area/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Simpan Gudang/ })).toBeInTheDocument();
    });

    it('calls onClose when Batal button is clicked', () => {
        render(<WarehouseForm areas={areas} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        
        fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('displays error message if onSubmit returns failure', async () => {
        mockOnSubmit.mockResolvedValueOnce({ success: false, error: 'Nama Gudang sudah ada' });

        render(<WarehouseForm areas={areas} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        
        fireEvent.change(screen.getByPlaceholderText(/Masukkan nama/), { target: { value: 'Test Gudang' } });
        fireEvent.click(screen.getByRole('button', { name: /Simpan Gudang/ }));

        await waitFor(() => {
            expect(screen.getByText('Nama Gudang sudah ada')).toBeInTheDocument();
        });
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when onSubmit is successful', async () => {
        mockOnSubmit.mockResolvedValueOnce({ success: true });

        render(<WarehouseForm areas={areas} onClose={mockOnClose} onSubmit={mockOnSubmit} />);
        
        fireEvent.change(screen.getByPlaceholderText(/Masukkan nama/), { target: { value: 'Test Gudang' } });
        fireEvent.click(screen.getByRole('button', { name: /Simpan Gudang/ }));

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    it('renders with initialData if provided', () => {
        const initialData = { id: 10, name: 'Gudang Pusat', type: 'PUSAT' as const, location: 'Jakarta', areaId: 1 };
        
        render(<WarehouseForm areas={areas} onClose={mockOnClose} onSubmit={mockOnSubmit} initialData={initialData} />);
        
        expect(screen.getByText('Edit Gudang/Cabang')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Gudang Pusat')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Jakarta')).toBeInTheDocument();
    });
});
