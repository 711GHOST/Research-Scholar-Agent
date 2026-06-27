import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

const EditProfileDialog = ({ open, user, onClose, onSaved }) => {
  const toast = useToast()
  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    role: user?.role || 'Student',
    phone: user?.phone || '',
    institution: user?.profile?.institution || '',
    department: user?.profile?.department || '',
    researchDomain: user?.profile?.researchDomain || '',
    bio: user?.profile?.bio || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const save = async () => {
    setError('')
    setSaving(true)
    try {
      const res = await api.put('/auth/profile', {
        name: form.name,
        role: form.role,
        phone: form.phone,
        profile: {
          institution: form.institution,
          department: form.department,
          researchDomain: form.researchDomain,
          bio: form.bio,
        },
      })
      toast.success('Profile updated')
      onSaved?.(res.data.user)
      onClose?.()
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.errors?.[0]?.msg || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Full name" name="name" value={form.name} onChange={change} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Role" name="role" value={form.role} onChange={change}>
              <MenuItem value="Student">Student</MenuItem>
              <MenuItem value="Research Scholar">Research Scholar</MenuItem>
              <MenuItem value="Faculty">Faculty</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone (international format)"
              name="phone"
              placeholder="+919876543210"
              value={form.phone}
              onChange={change}
              helperText="Changing this requires re-verification"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Institution" name="institution" value={form.institution} onChange={change} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Department" name="department" value={form.department} onChange={change} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Research domain" name="researchDomain" value={form.researchDomain} onChange={change} />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bio"
              name="bio"
              value={form.bio}
              onChange={change}
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText={`${form.bio.length}/500`}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !form.name.trim()}>
          {saving ? <CircularProgress size={22} /> : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditProfileDialog
