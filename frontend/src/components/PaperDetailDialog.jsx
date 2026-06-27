import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Stack,
  LinearProgress,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

const Section = ({ title, children }) => (
  <Box sx={{ mt: 2.5 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
      {title}
    </Typography>
    {children}
  </Box>
)

const priorityColor = (p) =>
  p === 'high' ? 'error' : p === 'low' ? 'default' : 'warning'

const PaperDetailDialog = ({ open, onClose, paper }) => {
  if (!paper) return null
  const summary = paper.summary
  const analyzing = paper.status === 'processing'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Typography component="div" variant="h6" sx={{ fontWeight: 700 }}>
          {paper.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {paper.authors?.length ? paper.authors.join(', ') : 'Unknown authors'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            size="small"
            label={paper.status}
            color={
              paper.status === 'analyzed'
                ? 'success'
                : paper.status === 'failed'
                ? 'error'
                : 'default'
            }
          />
          {paper.metadata?.journal && (
            <Chip size="small" variant="outlined" label={paper.metadata.journal} />
          )}
          {paper.topic && <Chip size="small" variant="outlined" label={paper.topic} />}
        </Stack>

        {analyzing && (
          <Box sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Analysis in progress…
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {!summary && !analyzing && (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <AutoAwesomeIcon sx={{ fontSize: 40, opacity: 0.5 }} />
            <Typography sx={{ mt: 1 }}>
              No analysis yet. Run “Analyze” to generate summaries, keywords and
              research gaps.
            </Typography>
          </Box>
        )}

        {summary && (
          <Box>
            {summary.sections && Object.values(summary.sections).some(Boolean) && (
              <Section title="Section Summaries">
                {Object.entries(summary.sections).map(([key, val]) =>
                  val ? (
                    <Box key={key} sx={{ mb: 1.5 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, textTransform: 'capitalize' }}
                      >
                        {key}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {val}
                      </Typography>
                    </Box>
                  ) : null
                )}
              </Section>
            )}

            {summary.keywords?.length > 0 && (
              <Section title="Keywords">
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {summary.keywords.map((k, i) => (
                    <Chip
                      key={i}
                      size="small"
                      label={`${k.word}${k.frequency ? ` · ${k.frequency}` : ''}`}
                    />
                  ))}
                </Box>
              </Section>
            )}

            {summary.topics?.length > 0 && (
              <Section title="Topics">
                <Stack spacing={0.5}>
                  {summary.topics.map((t, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{t.topic}</Typography>
                      <Chip size="small" variant="outlined" label={`${Math.round((t.confidence || 0) * 100)}%`} />
                    </Box>
                  ))}
                </Stack>
              </Section>
            )}

            {summary.researchGaps?.length > 0 && (
              <Section title="Research Gaps">
                <Stack spacing={1.5}>
                  {summary.researchGaps.map((g, i) => (
                    <Box key={i}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {g.gap}
                        </Typography>
                        {g.priority && (
                          <Chip size="small" label={g.priority} color={priorityColor(g.priority)} />
                        )}
                      </Box>
                      {g.reasoning && (
                        <Typography variant="body2" color="text.secondary">
                          {g.reasoning}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Section>
            )}

            {summary.researchQuestions?.length > 0 && (
              <Section title="Research Questions">
                <Stack spacing={0.5}>
                  {summary.researchQuestions.map((q, i) => (
                    <Typography key={i} variant="body2">
                      • {q.question}
                      {q.category ? ` (${q.category})` : ''}
                    </Typography>
                  ))}
                </Stack>
              </Section>
            )}

            {summary.relatedWorkSuggestions?.length > 0 && (
              <Section title="Related Work">
                <Stack spacing={1.5}>
                  {summary.relatedWorkSuggestions.map((r, i) => (
                    <Box key={i}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {r.title}
                      </Typography>
                      {r.authors?.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          {r.authors.join(', ')}
                        </Typography>
                      )}
                      {r.reason && <Typography variant="body2">{r.reason}</Typography>}
                    </Box>
                  ))}
                </Stack>
              </Section>
            )}

            <Divider sx={{ mt: 3 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Processed {summary.processedAt ? new Date(summary.processedAt).toLocaleString() : '—'} ·{' '}
              {summary.processingTime || 0}s · model {summary.aiModel || 'default'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PaperDetailDialog
